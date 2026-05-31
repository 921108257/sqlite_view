use tauri::State;

use crate::db::schema::{
    add_column, create_table, drop_column, drop_table, get_table_columns, get_tables,
    rename_table, ColumnInfo, CreateColumnDef, TableInfo,
};
use crate::db::DbManager;
use crate::error::AppResult;

#[tauri::command]
pub fn list_tables(db: State<DbManager>) -> AppResult<Vec<TableInfo>> {
    db.with_connection(|conn| get_tables(conn))
}

#[tauri::command]
pub fn get_columns(table: String, db: State<DbManager>) -> AppResult<Vec<ColumnInfo>> {
    db.with_connection(|conn| get_table_columns(conn, &table))
}

#[tauri::command]
pub fn create_new_table(
    name: String,
    columns: Vec<CreateColumnDef>,
    db: State<DbManager>,
) -> AppResult<()> {
    db.with_connection(|conn| create_table(conn, &name, &columns))
}

#[tauri::command]
pub fn delete_table(name: String, db: State<DbManager>) -> AppResult<()> {
    db.with_connection(|conn| drop_table(conn, &name))
}

#[tauri::command]
pub fn rename_existing_table(
    old_name: String,
    new_name: String,
    db: State<DbManager>,
) -> AppResult<()> {
    db.with_connection(|conn| rename_table(conn, &old_name, &new_name))
}

#[tauri::command]
pub fn add_table_column(
    table: String,
    column: CreateColumnDef,
    db: State<DbManager>,
) -> AppResult<()> {
    db.with_connection(|conn| add_column(conn, &table, &column))
}

#[tauri::command]
pub fn drop_table_column(
    table: String,
    column: String,
    db: State<DbManager>,
) -> AppResult<()> {
    db.with_connection(|conn| drop_column(conn, &table, &column))
}
