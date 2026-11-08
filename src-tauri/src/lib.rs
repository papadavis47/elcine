mod commands;
mod db;
mod models;
mod tmdb;

use std::sync::RwLock;
use turso::Database;
use tauri::Manager;

pub struct AppState {
    pub db: Database,
    /// TMDB key saved in settings, cached so lookups don't hit the DB.
    pub tmdb_key: RwLock<Option<String>>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let app_handle = app.handle().clone();
            tauri::async_runtime::block_on(async move {
                let db = db::init_db(&app_handle).await.expect("Failed to initialize database");
                let conn = db.connect().expect("Failed to connect to database");
                let saved_key = db::get_setting(&conn, db::TMDB_API_KEY)
                    .await
                    .expect("Failed to read settings");
                app_handle.manage(AppState {
                    db,
                    tmdb_key: RwLock::new(saved_key),
                });
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::add_movie,
            commands::update_movie,
            commands::delete_movie,
            commands::get_movies,
            commands::get_movie,
            commands::backfill_release_years,
            commands::upgrade_posters,
            commands::get_tmdb_key_status,
            commands::set_tmdb_api_key,
            commands::clear_tmdb_api_key,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
