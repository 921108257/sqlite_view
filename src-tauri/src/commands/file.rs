use tauri::State;

use crate::db::DbManager;
use crate::error::AppResult;

#[tauri::command]
pub fn open_database(path: String, db: State<DbManager>) -> AppResult<()> {
    db.open(&path)
}

#[tauri::command]
pub fn close_database(db: State<DbManager>) -> AppResult<()> {
    db.close()
}

#[tauri::command]
pub fn get_database_path(db: State<DbManager>) -> Option<String> {
    db.current_path()
}

#[tauri::command]
pub fn is_database_connected(db: State<DbManager>) -> bool {
    db.is_connected()
}
