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

fn get_api_key() -> Result<String, String> {
    dotenvy::dotenv().ok();
    std::env::var("TMDB_API_KEY").map_err(|_| "TMDB_API_KEY not found in environment".to_string())
}

pub async fn search_movie(title: &str) -> Result<Option<TmdbMovie>, String> {
    let api_key = get_api_key()?;
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

pub async fn get_movie_credits(tmdb_id: i64) -> Result<Option<String>, String> {
    let api_key = get_api_key()?;
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
pub async fn get_movie_details(tmdb_id: i64) -> Result<TmdbMovie, String> {
    let api_key = get_api_key()?;
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

    let local_filename = format!("{}.{}", tmdb_id, extension);
    let local_path = posters_dir.join(&local_filename);

    let url = format!("https://image.tmdb.org/t/p/w342{}", poster_path);

    let response = reqwest::get(&url).await.map_err(|e| e.to_string())?;
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
        let img = reqwest::get("https://image.tmdb.org/t/p/w342/qJ2tW6WMUDux911r6m7haRef0WH.jpg")
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
        let movie = search_movie("Stalker")
            .await
            .expect("search_movie failed")
            .expect("no results for 'Stalker'");

        assert!(movie.id > 0);
        assert!(!movie.title.is_empty());

        let director = get_movie_credits(movie.id)
            .await
            .expect("get_movie_credits failed");

        assert!(director.is_some(), "no Director found in crew for {}", movie.title);
    }
}
