use tauri::{AppHandle, Manager};
use turso::{Builder, Connection, Database, Value};

use crate::models::{CreateMovie, Movie, UpdateMovie};

const CREATE_MOVIES_TABLE: &str = r#"
    CREATE TABLE IF NOT EXISTS movies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        director TEXT NOT NULL,
        notes TEXT,
        is_favorite INTEGER DEFAULT 0,
        format TEXT NOT NULL,
        tmdb_id INTEGER,
        poster_path TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        release_year INTEGER
    )
"#;

const ADD_RELEASE_YEAR: &str = "ALTER TABLE movies ADD COLUMN release_year INTEGER";

/// Brings a database created by an older build up to the current schema.
/// `ADD COLUMN` has no `IF NOT EXISTS`, so a duplicate-column complaint just
/// means this migration already ran.
pub async fn migrate(conn: &Connection) -> Result<(), String> {
    match conn.execute(ADD_RELEASE_YEAR, ()).await {
        Ok(_) => Ok(()),
        Err(e) if e.to_string().to_lowercase().contains("duplicate column") => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

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

    conn.execute(CREATE_MOVIES_TABLE, ())
        .await
        .map_err(|e| e.to_string())?;

    migrate(&conn).await?;

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
    let year_str = movie_data
        .release_year
        .map(|y| y.to_string())
        .unwrap_or_default();

    conn.execute(
        r#"
        INSERT INTO movies (title, director, notes, is_favorite, format, tmdb_id, poster_path, release_year)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
        "#,
        [
            movie_data.title.as_str(),
            director.as_str(),
            notes.as_str(),
            if movie_data.is_favorite { "1" } else { "0" },
            movie_data.format.as_str(),
            tmdb_str.as_str(),
            poster.as_str(),
            year_str.as_str(),
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

pub async fn update_movie(
    conn: &Connection,
    update_data: UpdateMovie,
    tmdb_id: Option<i64>,
    poster_path: Option<String>,
) -> Result<Movie, String> {
    let notes = update_data.notes.unwrap_or_default();
    let id_str = update_data.id.to_string();
    let year_str = update_data
        .release_year
        .map(|y| y.to_string())
        .unwrap_or_default();
    let tmdb_str = tmdb_id.map(|id| id.to_string()).unwrap_or_default();
    let poster = poster_path.unwrap_or_default();

    conn.execute(
        r#"
        UPDATE movies
        SET title = ?1, director = ?2, notes = ?3, is_favorite = ?4, format = ?5, release_year = ?6, tmdb_id = ?7, poster_path = ?8
        WHERE id = ?9
        "#,
        [
            update_data.title.as_str(),
            update_data.director.as_str(),
            notes.as_str(),
            if update_data.is_favorite { "1" } else { "0" },
            update_data.format.as_str(),
            year_str.as_str(),
            tmdb_str.as_str(),
            poster.as_str(),
            id_str.as_str(),
        ],
    )
    .await
    .map_err(|e| e.to_string())?;

    get_movie(conn, update_data.id).await
}

/// Used by the TMDB backfill, which fills in only this one column and must
/// leave the rest of the row alone.
pub async fn set_release_year(conn: &Connection, id: i64, year: i64) -> Result<(), String> {
    let year_str = year.to_string();
    let id_str = id.to_string();
    conn.execute(
        "UPDATE movies SET release_year = ?1 WHERE id = ?2",
        [year_str.as_str(), id_str.as_str()],
    )
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
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
    let release_year = row.get_value(9).map_err(|e| e.to_string())?;

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
        release_year: match release_year {
            Value::Integer(i) => Some(i),
            Value::Text(t) if !t.is_empty() => t.parse().ok(),
            _ => None,
        },
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{CreateMovie, UpdateMovie};

    /// A throwaway on-disk database using the same schema as `init_db`.
    /// Returns the `Database` too — dropping it would close the connection.
    struct TempDb {
        _db: Database,
        conn: Connection,
        dir: std::path::PathBuf,
    }

    impl Drop for TempDb {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.dir);
        }
    }

    async fn temp_db(name: &str) -> TempDb {
        let dir = std::env::temp_dir().join(format!("elcine-test-{}-{}", name, std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();

        let path = dir.join("elcine.db").to_string_lossy().to_string();
        let db = Builder::new_local(&path).build().await.unwrap();
        let conn = db.connect().unwrap();
        conn.execute(CREATE_MOVIES_TABLE, ()).await.unwrap();

        TempDb { _db: db, conn, dir }
    }

    fn sample() -> CreateMovie {
        CreateMovie {
            title: "Stalker".into(),
            director: Some("Andrei Tarkovsky".into()),
            notes: Some("zone".into()),
            is_favorite: true,
            format: "Blu-ray".into(),
            release_year: Some(1979),
        }
    }

    #[tokio::test]
    async fn insert_returns_the_stored_row() {
        let t = temp_db("insert").await;

        let created = insert_movie(&t.conn, sample(), Some(1398), Some("posters/1398.jpg".into()))
            .await
            .expect("insert_movie failed");

        assert!(created.id > 0, "last_insert_rowid() did not resolve");
        assert_eq!(created.title, "Stalker");
        assert_eq!(created.director, "Andrei Tarkovsky");
        assert_eq!(created.notes.as_deref(), Some("zone"));
        assert!(created.is_favorite);
        assert_eq!(created.format, "Blu-ray");
        assert_eq!(created.tmdb_id, Some(1398));
        assert_eq!(created.poster_path.as_deref(), Some("posters/1398.jpg"));
        assert_eq!(created.release_year, Some(1979));
        assert!(!created.created_at.is_empty(), "created_at default not applied");
    }

    /// Empty strings are the sentinel `insert_movie` writes for absent optional
    /// fields; `row_to_movie` has to map them back to `None`, not `Some("")`.
    #[tokio::test]
    async fn absent_optional_fields_come_back_as_none() {
        let t = temp_db("optionals").await;

        let created = insert_movie(
            &t.conn,
            CreateMovie {
                title: "Untitled".into(),
                director: None,
                notes: None,
                is_favorite: false,
                format: "DVD".into(),
                release_year: None,
            },
            None,
            None,
        )
        .await
        .expect("insert_movie failed");

        assert_eq!(created.director, "");
        assert_eq!(created.notes, None);
        assert_eq!(created.tmdb_id, None);
        assert_eq!(created.poster_path, None);
        assert_eq!(created.release_year, None);
        assert!(!created.is_favorite);
    }

    #[tokio::test]
    async fn update_overwrites_tmdb_fields_with_the_values_passed_in() {
        let t = temp_db("update").await;

        let created = insert_movie(&t.conn, sample(), Some(1398), Some("posters/1398.jpg".into()))
            .await
            .unwrap();

        let updated = update_movie(
            &t.conn,
            UpdateMovie {
                id: created.id,
                title: "Solaris".into(),
                director: "Andrei Tarkovsky".into(),
                notes: None,
                is_favorite: false,
                format: "DVD".into(),
                release_year: Some(1972),
            },
            Some(423),
            Some("posters/423.jpg".into()),
        )
        .await
        .expect("update_movie failed");

        assert_eq!(updated.title, "Solaris");
        assert_eq!(updated.notes, None);
        assert!(!updated.is_favorite);
        assert_eq!(updated.format, "DVD");
        assert_eq!(updated.release_year, Some(1972));
        assert_eq!(updated.tmdb_id, Some(423));
        assert_eq!(updated.poster_path.as_deref(), Some("posters/423.jpg"));
        assert_eq!(updated.created_at, created.created_at);
    }

    /// The backfill path: an existing row with no year picks one up without
    /// disturbing any other column.
    #[tokio::test]
    async fn set_release_year_fills_only_that_column() {
        let t = temp_db("backfill").await;

        let created = insert_movie(
            &t.conn,
            CreateMovie {
                title: "Stalker".into(),
                director: Some("Andrei Tarkovsky".into()),
                notes: Some("zone".into()),
                is_favorite: true,
                format: "Blu-ray".into(),
                release_year: None,
            },
            Some(1398),
            Some("posters/1398.jpg".into()),
        )
        .await
        .unwrap();
        assert_eq!(created.release_year, None);

        set_release_year(&t.conn, created.id, 1979)
            .await
            .expect("set_release_year failed");

        let after = get_movie(&t.conn, created.id).await.unwrap();
        assert_eq!(after.release_year, Some(1979));
        assert_eq!(after.title, "Stalker");
        assert_eq!(after.notes.as_deref(), Some("zone"));
        assert!(after.is_favorite);
        assert_eq!(after.tmdb_id, Some(1398));
        assert_eq!(after.poster_path.as_deref(), Some("posters/1398.jpg"));
    }

    /// A database written by a build that predates `release_year` has to gain
    /// the column on open, and rows already in it read back as `None`.
    #[tokio::test]
    async fn migrate_upgrades_a_pre_release_year_database() {
        const LEGACY_SCHEMA: &str = "
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
            )";

        let dir = std::env::temp_dir().join(format!("elcine-test-legacy-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("elcine.db").to_string_lossy().to_string();

        let db = Builder::new_local(&path).build().await.unwrap();
        let conn = db.connect().unwrap();
        conn.execute(LEGACY_SCHEMA, ()).await.unwrap();
        conn.execute(
            "INSERT INTO movies (title, director, format) VALUES ('Stalker', 'Tarkovsky', 'DVD')",
            (),
        )
        .await
        .unwrap();

        migrate(&conn).await.expect("migrate failed on legacy schema");
        // Opening the same database twice must not fail on the duplicate column.
        migrate(&conn).await.expect("migrate is not idempotent");

        let movies = get_all_movies(&conn).await.expect("read after migrate failed");
        assert_eq!(movies.len(), 1);
        assert_eq!(movies[0].release_year, None);

        drop(conn);
        drop(db);
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[tokio::test]
    async fn get_all_and_get_one_and_delete() {
        let t = temp_db("readdelete").await;

        assert!(get_all_movies(&t.conn).await.unwrap().is_empty());

        let a = insert_movie(&t.conn, sample(), None, None).await.unwrap();
        let b = insert_movie(
            &t.conn,
            CreateMovie {
                title: "Mirror".into(),
                director: Some("Andrei Tarkovsky".into()),
                notes: None,
                is_favorite: false,
                format: "Digital".into(),
                release_year: Some(1975),
            },
            None,
            None,
        )
        .await
        .unwrap();

        assert_eq!(get_all_movies(&t.conn).await.unwrap().len(), 2);
        assert_eq!(get_movie(&t.conn, a.id).await.unwrap().title, "Stalker");
        assert_eq!(get_movie(&t.conn, b.id).await.unwrap().title, "Mirror");

        delete_movie(&t.conn, a.id).await.expect("delete_movie failed");

        let remaining = get_all_movies(&t.conn).await.unwrap();
        assert_eq!(remaining.len(), 1);
        assert_eq!(remaining[0].id, b.id);
        assert!(get_movie(&t.conn, a.id).await.is_err(), "deleted row still readable");
    }
}
