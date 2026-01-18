mod commands;
mod db;
mod models;
mod tmdb;

use turso::Database;
use tauri::Manager;

pub struct AppState {
    pub db: Database,
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
                app_handle.manage(AppState { db });
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::add_movie,
            commands::update_movie,
            commands::delete_movie,
            commands::get_movies,
            commands::get_movie,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
