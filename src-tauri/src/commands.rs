use serde::Serialize;
use tauri::{AppHandle, State};

use crate::db;
use crate::models::{CreateMovie, Movie, UpdateMovie};
use crate::tmdb;
use crate::AppState;

#[tauri::command]
pub async fn add_movie(
    app_handle: AppHandle,
    state: State<'_, AppState>,
    movie: CreateMovie,
) -> Result<Movie, String> {
    let mut tmdb_id: Option<i64> = None;
    let mut poster_path: Option<String> = None;
    let mut director = movie.director.clone();
    // A year typed into the form wins; TMDB only fills the gap.
    let mut release_year = movie.release_year;

    if let Some((tmdb_movie, key)) = lookup(&state, &movie.title).await {
        tmdb_id = Some(tmdb_movie.id);

        if release_year.is_none() {
            release_year = tmdb::year_from_release_date(tmdb_movie.release_date.as_deref());
        }

        if director.is_none() {
            if let Ok(Some(dir)) = tmdb::get_movie_credits(tmdb_movie.id, &key).await {
                director = Some(dir);
            }
        }

        if let Some(ref path) = tmdb_movie.poster_path {
            if let Ok(local_path) = tmdb::download_poster(&app_handle, path, tmdb_movie.id).await {
                poster_path = Some(local_path);
            }
        }
    }

    let movie_data = CreateMovie {
        title: movie.title,
        director,
        notes: movie.notes,
        is_favorite: movie.is_favorite,
        format: movie.format,
        release_year,
    };

    let conn = state.db.connect().map_err(|e| e.to_string())?;
    let created = db::insert_movie(&conn, movie_data, tmdb_id, poster_path).await?;
    with_poster_path(&app_handle, created)
}

/// Every edit re-resolves the movie against TMDB by its (possibly just-edited)
/// title and overwrites tmdb_id/director/release_year/poster with the fresh
/// response, so a bad initial match or stale poster gets corrected on save.
/// A failed/empty lookup leaves those fields untouched rather than wiping them.
#[tauri::command]
pub async fn update_movie(
    app_handle: AppHandle,
    state: State<'_, AppState>,
    movie: UpdateMovie,
) -> Result<Movie, String> {
    let conn = state.db.connect().map_err(|e| e.to_string())?;
    let existing = db::get_movie(&conn, movie.id).await?;

    let mut tmdb_id = existing.tmdb_id;
    let mut director = movie.director.clone();
    let mut release_year = movie.release_year;
    let mut poster_path = existing.poster_path.clone();

    if let Some((tmdb_movie, key)) = lookup(&state, &movie.title).await {
        tmdb_id = Some(tmdb_movie.id);
        release_year = tmdb::year_from_release_date(tmdb_movie.release_date.as_deref());

        if let Ok(Some(dir)) = tmdb::get_movie_credits(tmdb_movie.id, &key).await {
            director = dir;
        }

        let mut new_poster_path = None;
        if let Some(ref path) = tmdb_movie.poster_path {
            if let Ok(local_path) = tmdb::download_poster(&app_handle, path, tmdb_movie.id).await {
                new_poster_path = Some(local_path);
            }
        }

        if let Some(old_name) = &existing.poster_path {
            if new_poster_path.as_ref() != Some(old_name) {
                remove_poster(&app_handle, old_name);
            }
        }
        poster_path = new_poster_path;
    }

    let update_data = UpdateMovie {
        director,
        release_year,
        ..movie
    };

    let updated = db::update_movie(&conn, update_data, tmdb_id, poster_path).await?;
    with_poster_path(&app_handle, updated)
}

#[tauri::command]
pub async fn delete_movie(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.connect().map_err(|e| e.to_string())?;
    db::delete_movie(&conn, id).await
}

#[tauri::command]
pub async fn get_movies(app_handle: AppHandle, state: State<'_, AppState>) -> Result<Vec<Movie>, String> {
    let conn = state.db.connect().map_err(|e| e.to_string())?;
    db::get_all_movies(&conn)
        .await?
        .into_iter()
        .map(|m| with_poster_path(&app_handle, m))
        .collect()
}

/// Fills in `release_year` for movies added before the field existed. Runs on
/// app start; a film TMDB can't answer for is left alone and simply retried on
/// the next launch. Returns how many rows it filled.
#[tauri::command]
pub async fn backfill_release_years(state: State<'_, AppState>) -> Result<usize, String> {
    let Some(key) = tmdb_key(&state) else {
        return Ok(0);
    };
    let conn = state.db.connect().map_err(|e| e.to_string())?;
    let movies = db::get_all_movies(&conn).await?;

    let mut filled = 0;
    for movie in movies {
        if movie.release_year.is_some() {
            continue;
        }
        let Some(tmdb_id) = movie.tmdb_id else {
            continue;
        };
        let Ok(details) = tmdb::get_movie_details(tmdb_id, &key).await else {
            continue;
        };
        if let Some(year) = tmdb::year_from_release_date(details.release_date.as_deref()) {
            db::set_release_year(&conn, movie.id, year).await?;
            filled += 1;
        }
    }

    Ok(filled)
}

/// Re-downloads posters cached at an older size (see `tmdb::POSTER_SIZE`).
/// Runs on app start like the release-year backfill; a poster that fails to
/// download keeps its old file and is retried next launch. Returns how many
/// posters it replaced.
#[tauri::command]
pub async fn upgrade_posters(
    app_handle: AppHandle,
    state: State<'_, AppState>,
) -> Result<usize, String> {
    let Some(key) = tmdb_key(&state) else {
        return Ok(0);
    };
    let conn = state.db.connect().map_err(|e| e.to_string())?;
    let movies = db::get_all_movies(&conn).await?;

    let mut upgraded = 0;
    for movie in movies {
        let Some(old_name) = movie.poster_path else {
            continue;
        };
        if tmdb::is_current_poster(&old_name) {
            continue;
        }
        let Some(tmdb_id) = movie.tmdb_id else {
            continue;
        };
        let Ok(details) = tmdb::get_movie_details(tmdb_id, &key).await else {
            continue;
        };
        let Some(remote_path) = details.poster_path else {
            continue;
        };
        let Ok(new_path) = tmdb::download_poster(&app_handle, &remote_path, tmdb_id).await else {
            continue;
        };
        db::set_poster_path(&conn, movie.id, &new_path).await?;
        remove_poster(&app_handle, &old_name);
        upgraded += 1;
    }

    Ok(upgraded)
}

#[tauri::command]
pub async fn get_movie(app_handle: AppHandle, state: State<'_, AppState>, id: i64) -> Result<Movie, String> {
    let conn = state.db.connect().map_err(|e| e.to_string())?;
    let movie = db::get_movie(&conn, id).await?;
    with_poster_path(&app_handle, movie)
}

/// The DB stores poster file names; the frontend needs a full path for
/// `convertFileSrc`. Resolve against the current data dir on the way out.
fn with_poster_path(app_handle: &AppHandle, mut movie: Movie) -> Result<Movie, String> {
    if let Some(name) = movie.poster_path.take() {
        let dir = tmdb::posters_dir(app_handle)?;
        movie.poster_path = Some(dir.join(name).to_string_lossy().to_string());
    }
    Ok(movie)
}

fn remove_poster(app_handle: &AppHandle, name: &str) {
    if let Ok(dir) = tmdb::posters_dir(app_handle) {
        let _ = std::fs::remove_file(dir.join(name));
    }
}

/// The key to use for TMDB calls: one saved in settings wins over the
/// `TMDB_API_KEY` env/.env developer fallback. `None` means TMDB is skipped.
fn tmdb_key(state: &AppState) -> Option<String> {
    let saved = state.tmdb_key.read().expect("tmdb_key lock poisoned").clone();
    saved.or_else(tmdb::env_api_key)
}

/// Title search with whichever key is configured. Returns the key alongside the
/// match so follow-up calls (credits) use the same one.
async fn lookup(state: &AppState, title: &str) -> Option<(tmdb::TmdbMovie, String)> {
    let key = tmdb_key(state)?;
    let found = tmdb::search_movie(title, &key).await.ok().flatten()?;
    Some((found, key))
}

#[derive(Serialize)]
#[serde(rename_all = "lowercase")]
pub enum TmdbKeySource {
    Saved,
    Env,
}

#[derive(Serialize)]
pub struct TmdbKeyStatus {
    pub source: Option<TmdbKeySource>,
}

#[tauri::command]
pub fn get_tmdb_key_status(state: State<'_, AppState>) -> TmdbKeyStatus {
    let saved = state.tmdb_key.read().expect("tmdb_key lock poisoned").is_some();
    let source = if saved {
        Some(TmdbKeySource::Saved)
    } else if tmdb::env_api_key().is_some() {
        Some(TmdbKeySource::Env)
    } else {
        None
    };
    TmdbKeyStatus { source }
}

/// Checks the key with TMDB before saving, so a typo shows up here rather than
/// as movies silently missing posters later.
#[tauri::command]
pub async fn set_tmdb_api_key(state: State<'_, AppState>, key: String) -> Result<(), String> {
    let key = key.trim();
    if key.is_empty() {
        return Err("Enter an API key.".into());
    }
    match tmdb::validate_api_key(key).await {
        Ok(true) => {}
        Ok(false) => return Err("TMDB rejected this key. Check it and try again.".into()),
        Err(e) => return Err(format!("Couldn't reach TMDB to check the key ({e}).")),
    }
    let conn = state.db.connect().map_err(|e| e.to_string())?;
    db::set_setting(&conn, db::TMDB_API_KEY, key).await?;
    *state.tmdb_key.write().expect("tmdb_key lock poisoned") = Some(key.to_string());
    Ok(())
}

#[tauri::command]
pub async fn clear_tmdb_api_key(state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.db.connect().map_err(|e| e.to_string())?;
    db::delete_setting(&conn, db::TMDB_API_KEY).await?;
    *state.tmdb_key.write().expect("tmdb_key lock poisoned") = None;
    Ok(())
}
