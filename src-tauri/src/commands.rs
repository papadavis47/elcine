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

    if let Ok(Some(tmdb_movie)) = tmdb::search_movie(&movie.title).await {
        tmdb_id = Some(tmdb_movie.id);

        if director.is_none() {
            if let Ok(Some(dir)) = tmdb::get_movie_credits(tmdb_movie.id).await {
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
    };

    let conn = state.db.connect().map_err(|e| e.to_string())?;
    db::insert_movie(&conn, movie_data, tmdb_id, poster_path).await
}

#[tauri::command]
pub async fn update_movie(
    state: State<'_, AppState>,
    movie: UpdateMovie,
) -> Result<Movie, String> {
    let conn = state.db.connect().map_err(|e| e.to_string())?;
    db::update_movie(&conn, movie).await
}

#[tauri::command]
pub async fn delete_movie(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.connect().map_err(|e| e.to_string())?;
    db::delete_movie(&conn, id).await
}

#[tauri::command]
pub async fn get_movies(state: State<'_, AppState>) -> Result<Vec<Movie>, String> {
    let conn = state.db.connect().map_err(|e| e.to_string())?;
    db::get_all_movies(&conn).await
}

#[tauri::command]
pub async fn get_movie(state: State<'_, AppState>, id: i64) -> Result<Movie, String> {
    let conn = state.db.connect().map_err(|e| e.to_string())?;
    db::get_movie(&conn, id).await
}
