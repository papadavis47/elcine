use tauri::{AppHandle, Manager};
use turso::{Builder, Connection, Database, Value};

use crate::models::{CreateMovie, Movie, UpdateMovie};

pub async fn init_db(app_handle: &AppHandle) -> Result<Database, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    std::fs::create_dir_all(&app_data_dir).map_err(|e| e.to_string())?;

    let db_path = app_data_dir.join("elcine.db");
    let db_path_str = db_path.to_string_lossy().to_string();

    let db = Builder::new_local(&db_path_str)
        .build()
        .await
        .map_err(|e| e.to_string())?;

    let conn = db.connect().map_err(|e| e.to_string())?;

    conn.execute(
        r#"
        CREATE TABLE IF NOT EXISTS movies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            director TEXT NOT NULL,
            notes TEXT,
            is_favorite INTEGER DEFAULT 0,
            format TEXT NOT NULL,
            tmdb_id INTEGER,
            poster_path TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )
        "#,
        (),
    )
    .await
    .map_err(|e| e.to_string())?;

    Ok(db)
}

pub async fn insert_movie(
    conn: &Connection,
    movie_data: CreateMovie,
    tmdb_id: Option<i64>,
    poster_path: Option<String>,
) -> Result<Movie, String> {
    let director = movie_data.director.unwrap_or_default();
    let notes = movie_data.notes.unwrap_or_default();
    let poster = poster_path.unwrap_or_default();
    let tmdb_str = tmdb_id.map(|id| id.to_string()).unwrap_or_default();

    conn.execute(
        r#"
        INSERT INTO movies (title, director, notes, is_favorite, format, tmdb_id, poster_path)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
        "#,
        [
            movie_data.title.as_str(),
            director.as_str(),
            notes.as_str(),
            if movie_data.is_favorite { "1" } else { "0" },
            movie_data.format.as_str(),
            tmdb_str.as_str(),
            poster.as_str(),
        ],
    )
    .await
    .map_err(|e| e.to_string())?;

    let mut rows = conn
        .query("SELECT * FROM movies WHERE id = last_insert_rowid()", ())
        .await
        .map_err(|e| e.to_string())?;

    let row = rows
        .next()
        .await
        .map_err(|e| e.to_string())?
        .ok_or("No movie found")?;

    row_to_movie(&row)
}

pub async fn update_movie(conn: &Connection, update_data: UpdateMovie) -> Result<Movie, String> {
    let notes = update_data.notes.unwrap_or_default();
    let id_str = update_data.id.to_string();

    conn.execute(
        r#"
        UPDATE movies
        SET title = ?1, director = ?2, notes = ?3, is_favorite = ?4, format = ?5
        WHERE id = ?6
        "#,
        [
            update_data.title.as_str(),
            update_data.director.as_str(),
            notes.as_str(),
            if update_data.is_favorite { "1" } else { "0" },
            update_data.format.as_str(),
            id_str.as_str(),
        ],
    )
    .await
    .map_err(|e| e.to_string())?;

    get_movie(conn, update_data.id).await
}

pub async fn delete_movie(conn: &Connection, id: i64) -> Result<(), String> {
    let id_str = id.to_string();
    conn.execute("DELETE FROM movies WHERE id = ?1", [id_str.as_str()])
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub async fn get_all_movies(conn: &Connection) -> Result<Vec<Movie>, String> {
    let mut rows = conn
        .query("SELECT * FROM movies ORDER BY created_at DESC", ())
        .await
        .map_err(|e| e.to_string())?;

    let mut movies = Vec::new();
    while let Some(row) = rows.next().await.map_err(|e| e.to_string())? {
        movies.push(row_to_movie(&row)?);
    }

    Ok(movies)
}

pub async fn get_movie(conn: &Connection, id: i64) -> Result<Movie, String> {
    let id_str = id.to_string();
    let mut rows = conn
        .query("SELECT * FROM movies WHERE id = ?1", [id_str.as_str()])
        .await
        .map_err(|e| e.to_string())?;

    let row = rows
        .next()
        .await
        .map_err(|e| e.to_string())?
        .ok_or("Movie not found")?;

    row_to_movie(&row)
}

fn row_to_movie(row: &turso::Row) -> Result<Movie, String> {
    let id = row.get_value(0).map_err(|e| e.to_string())?;
    let title = row.get_value(1).map_err(|e| e.to_string())?;
    let director = row.get_value(2).map_err(|e| e.to_string())?;
    let notes = row.get_value(3).map_err(|e| e.to_string())?;
    let is_favorite = row.get_value(4).map_err(|e| e.to_string())?;
    let format = row.get_value(5).map_err(|e| e.to_string())?;
    let tmdb_id = row.get_value(6).map_err(|e| e.to_string())?;
    let poster_path = row.get_value(7).map_err(|e| e.to_string())?;
    let created_at = row.get_value(8).map_err(|e| e.to_string())?;

    Ok(Movie {
        id: match id {
            Value::Integer(i) => i,
            _ => return Err("Invalid id".to_string()),
        },
        title: match title {
            Value::Text(t) => t,
            _ => return Err("Invalid title".to_string()),
        },
        director: match director {
            Value::Text(t) => t,
            _ => return Err("Invalid director".to_string()),
        },
        notes: match notes {
            Value::Text(t) if !t.is_empty() => Some(t),
            _ => None,
        },
        is_favorite: match is_favorite {
            Value::Integer(i) => i != 0,
            Value::Text(t) => t == "1",
            _ => false,
        },
        format: match format {
            Value::Text(t) => t,
            _ => return Err("Invalid format".to_string()),
        },
        tmdb_id: match tmdb_id {
            Value::Integer(i) => Some(i),
            Value::Text(t) if !t.is_empty() => t.parse().ok(),
            _ => None,
        },
        poster_path: match poster_path {
            Value::Text(t) if !t.is_empty() => Some(t),
            _ => None,
        },
        created_at: match created_at {
            Value::Text(t) => t,
            _ => return Err("Invalid created_at".to_string()),
        },
    })
}
