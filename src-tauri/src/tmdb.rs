use serde::Deserialize;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use tokio::io::AsyncWriteExt;

#[derive(Debug, Deserialize)]
pub struct TmdbSearchResponse {
    pub results: Vec<TmdbMovie>,
}

#[derive(Debug, Deserialize, Clone)]
#[allow(dead_code)]
pub struct TmdbMovie {
    pub id: i64,
    pub title: String,
    pub poster_path: Option<String>,
    pub release_date: Option<String>,
}

/// TMDB reports release dates as `YYYY-MM-DD`, but leaves them null or empty
/// for films it has no date for.
pub fn year_from_release_date(release_date: Option<&str>) -> Option<i64> {
    release_date?.get(..4)?.parse().ok()
}

#[derive(Debug, Deserialize)]
pub struct TmdbCreditsResponse {
    pub crew: Vec<TmdbCrewMember>,
}

#[derive(Debug, Deserialize)]
pub struct TmdbCrewMember {
    pub job: String,
    pub name: String,
}

/// Developer fallback: `TMDB_API_KEY` from the environment or a `.env` file.
/// A key saved in the app's settings takes precedence (see `commands::tmdb_key`).
pub fn env_api_key() -> Option<String> {
    dotenvy::dotenv().ok();
    std::env::var("TMDB_API_KEY")
        .ok()
        .map(|k| k.trim().to_string())
        .filter(|k| !k.is_empty())
}

/// Asks TMDB whether `api_key` is valid. `Ok(false)` means TMDB rejected it;
/// `Err` means we couldn't find out (offline, TMDB down).
pub async fn validate_api_key(api_key: &str) -> Result<bool, String> {
    let url = format!(
        "https://api.themoviedb.org/3/configuration?api_key={}",
        urlencoding::encode(api_key)
    );
    let status = reqwest::get(&url).await.map_err(|e| e.to_string())?.status();
    match status.as_u16() {
        200..=299 => Ok(true),
        401 => Ok(false),
        code => Err(format!("TMDB returned HTTP {code}")),
    }
}

pub async fn search_movie(title: &str, api_key: &str) -> Result<Option<TmdbMovie>, String> {
    let url = format!(
        "https://api.themoviedb.org/3/search/movie?api_key={}&query={}",
        api_key,
        urlencoding::encode(title)
    );

    let response: TmdbSearchResponse = reqwest::get(&url)
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;

    Ok(response.results.into_iter().next())
}

pub async fn get_movie_credits(tmdb_id: i64, api_key: &str) -> Result<Option<String>, String> {
    let url = format!(
        "https://api.themoviedb.org/3/movie/{}/credits?api_key={}",
        tmdb_id, api_key
    );

    let response: TmdbCreditsResponse = reqwest::get(&url)
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;

    let director = response
        .crew
        .into_iter()
        .find(|c| c.job == "Director")
        .map(|c| c.name);

    Ok(director)
}

/// Looks a film up by its TMDB id rather than its title. The backfill already
/// knows the id, so it must not go back through the fuzzy title search.
pub async fn get_movie_details(tmdb_id: i64, api_key: &str) -> Result<TmdbMovie, String> {
    let url = format!(
        "https://api.themoviedb.org/3/movie/{}?api_key={}",
        tmdb_id, api_key
    );

    reqwest::get(&url)
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())
}

/// TMDB image width cached locally. Big enough for the centered detail view;
/// the grid just scales it down.
pub const POSTER_SIZE: &str = "w780";

/// Cached posters are named `{tmdb_id}-{size}.{ext}`. Anything else (the old
/// `{tmdb_id}.{ext}` files were w342) predates the current size and gets
/// re-downloaded by the poster upgrade.
pub fn is_current_poster(local_path: &str) -> bool {
    PathBuf::from(local_path)
        .file_stem()
        .and_then(|s| s.to_str())
        .is_some_and(|stem| stem.ends_with(&format!("-{POSTER_SIZE}")))
}

pub async fn download_poster(
    app_handle: &AppHandle,
    poster_path: &str,
    tmdb_id: i64,
) -> Result<String, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    let posters_dir = app_data_dir.join("posters");
    std::fs::create_dir_all(&posters_dir).map_err(|e| e.to_string())?;

    let extension = PathBuf::from(poster_path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("jpg")
        .to_string();

    let local_filename = format!("{tmdb_id}-{POSTER_SIZE}.{extension}");
    let local_path = posters_dir.join(&local_filename);

    let url = format!("https://image.tmdb.org/t/p/{POSTER_SIZE}{poster_path}");

    let response = reqwest::get(&url)
        .await
        .and_then(|r| r.error_for_status())
        .map_err(|e| e.to_string())?;
    let bytes = response.bytes().await.map_err(|e| e.to_string())?;

    let mut file = tokio::fs::File::create(&local_path)
        .await
        .map_err(|e| e.to_string())?;
    file.write_all(&bytes).await.map_err(|e| e.to_string())?;

    Ok(local_path.to_string_lossy().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn year_parsing_handles_every_shape_tmdb_returns() {
        assert_eq!(year_from_release_date(Some("1979-05-25")), Some(1979));
        assert_eq!(year_from_release_date(Some("1979")), Some(1979));
        assert_eq!(year_from_release_date(None), None);
        assert_eq!(year_from_release_date(Some("")), None);
        assert_eq!(year_from_release_date(Some("197")), None);
        assert_eq!(year_from_release_date(Some("not-a-date")), None);
    }

    #[test]
    fn current_poster_is_recognised_by_size_suffix() {
        assert!(is_current_poster("/data/posters/1398-w780.jpg"));
        assert!(!is_current_poster("/data/posters/1398.jpg"));
        assert!(!is_current_poster("/data/posters/1398-w342.jpg"));
        assert!(!is_current_poster(""));
    }
}

/// Network tests. These hit the real TMDB API, so they are `#[ignore]`d and do
/// not run under a plain `cargo test`. They need `src-tauri/.env` to hold a
/// valid `TMDB_API_KEY`, plus internet access.
///
///     cargo test -- --ignored
#[cfg(test)]
mod network_tests {
    use super::*;

    /// Exercises the raw transport both TMDB calls depend on: TLS handshake
    /// against each host, then the JSON and byte body paths. Needs no API key,
    /// so this one still tells you something when the key is missing.
    #[tokio::test]
    #[ignore = "hits the network"]
    async fn https_transport_to_tmdb_hosts() {
        let resp = reqwest::get(
            "https://api.themoviedb.org/3/search/movie?api_key=invalid&query=stalker",
        )
        .await
        .expect("TLS handshake / request to api.themoviedb.org failed");

        let status = resp.status();
        assert!(
            status.is_client_error() || status.is_success(),
            "unexpected status from api.themoviedb.org: {status}"
        );

        let body: serde_json::Value = resp.json().await.expect(".json() decode failed");
        assert!(
            body.get("status_message").is_some() || body.get("results").is_some(),
            "unexpected body shape: {body}"
        );

        // The byte path used by download_poster.
        let img = reqwest::get("https://image.tmdb.org/t/p/w780/qJ2tW6WMUDux911r6m7haRef0WH.jpg")
            .await
            .expect("TLS handshake / request to image.tmdb.org failed");
        assert!(img.status().is_success(), "image CDN returned {}", img.status());

        let bytes = img.bytes().await.expect(".bytes() failed");
        assert!(!bytes.is_empty(), "empty body from image CDN");
    }

    /// The real thing: authenticated search plus the crew lookup that backs
    /// director auto-fill.
    #[tokio::test]
    #[ignore = "hits the network, needs TMDB_API_KEY"]
    async fn search_then_credits() {
        let key = env_api_key().expect("TMDB_API_KEY not set");
        assert!(validate_api_key(&key).await.expect("validate failed"));
        assert!(!validate_api_key("invalid").await.expect("validate failed"));

        let movie = search_movie("Stalker", &key)
            .await
            .expect("search_movie failed")
            .expect("no results for 'Stalker'");

        assert!(movie.id > 0);
        assert!(!movie.title.is_empty());

        let director = get_movie_credits(movie.id, &key)
            .await
            .expect("get_movie_credits failed");

        assert!(director.is_some(), "no Director found in crew for {}", movie.title);
    }
}
