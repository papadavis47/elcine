use serde::Deserialize;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use tokio::io::AsyncWriteExt;

#[derive(Debug, Deserialize)]
pub struct TmdbSearchResponse {
    pub results: Vec<TmdbMovie>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct TmdbMovie {
    pub id: i64,
    pub title: String,
    pub poster_path: Option<String>,
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
