mod commands;
mod db;
mod error;

use db::create_db_manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_cli::init())
        .manage(create_db_manager())
        .invoke_handler(tauri::generate_handler![
            // File commands
            commands::open_database,
            commands::close_database,
            commands::get_database_path,
            commands::is_database_connected,
            // Table commands
            commands::list_tables,
            commands::get_columns,
            commands::create_new_table,
            commands::delete_table,
            commands::rename_existing_table,
            commands::add_table_column,
            commands::drop_table_column,
            // Data commands
            commands::query_table_data,
            commands::insert_table_row,
            commands::update_table_row,
            commands::delete_table_row,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
