use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Movie {
    pub id: i64,
    pub title: String,
    pub director: String,
    pub notes: Option<String>,
    pub is_favorite: bool,
    pub format: String,
    pub tmdb_id: Option<i64>,
    pub poster_path: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateMovie {
    pub title: String,
    pub director: Option<String>,
    pub notes: Option<String>,
    pub is_favorite: bool,
    pub format: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateMovie {
    pub id: i64,
    pub title: String,
    pub director: String,
    pub notes: Option<String>,
    pub is_favorite: bool,
    pub format: String,
}
