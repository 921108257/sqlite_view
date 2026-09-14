use serde_json::{Map, Value as JsonValue};
use tauri::State;

use crate::db::export::{export_rows_to_csv, export_rows_to_json, ExportFormat, ExportOutcome};
use crate::db::query::{
    clear_table, delete_row, delete_rows, get_column_values, insert_row, query_table, update_row,
    ColumnValues, QueryFilter, QueryParams, QueryResult,
};
use crate::db::DbManager;
use crate::error::AppResult;

#[tauri::command]
pub fn query_table_data(params: QueryParams, db: State<DbManager>) -> AppResult<QueryResult> {
    db.with_connection(|conn| query_table(conn, &params))
}

#[tauri::command]
pub fn get_table_column_values(
    table: String,
    column: String,
    filters: Option<Vec<QueryFilter>>,
    db: State<DbManager>,
) -> AppResult<ColumnValues> {
    db.with_connection(|conn| get_column_values(conn, &table, &column, filters.as_deref()))
}

#[tauri::command]
pub fn insert_table_row(
    table: String,
    data: Map<String, JsonValue>,
    db: State<DbManager>,
) -> AppResult<i64> {
    db.with_connection(|conn| insert_row(conn, &table, &data))
}

#[tauri::command]
pub fn update_table_row(
    table: String,
    data: Map<String, JsonValue>,
    pk_column: String,
    pk_value: JsonValue,
    db: State<DbManager>,
) -> AppResult<usize> {
    db.with_connection(|conn| update_row(conn, &table, &data, &pk_column, &pk_value))
}

#[tauri::command]
pub fn delete_table_row(
    table: String,
    pk_column: String,
    pk_value: JsonValue,
    db: State<DbManager>,
) -> AppResult<usize> {
    db.with_connection(|conn| delete_row(conn, &table, &pk_column, &pk_value))
}

#[tauri::command]
pub fn delete_table_rows(
    table: String,
    pk_column: String,
    pk_values: Vec<JsonValue>,
    db: State<DbManager>,
) -> AppResult<usize> {
    db.with_connection(|conn| delete_rows(conn, &table, &pk_column, &pk_values))
}

#[tauri::command]
pub fn clear_table_data(table: String, db: State<DbManager>) -> AppResult<usize> {
    db.with_connection(|conn| clear_table(conn, &table))
}

/// Write text to a path chosen by the user in the native save dialog. Used for
/// the JSON view's "download" and for the row `.json` export.
#[tauri::command]
pub fn write_text_file(path: String, contents: String) -> AppResult<()> {
    std::fs::write(path, contents)?;
    Ok(())
}

/// Stream the whole table (not just the current page) to `path` on disk. The
/// frontend supplies the path from the native save dialog.
#[tauri::command]
pub fn export_table_data(
    params: QueryParams,
    format: String,
    path: String,
    db: State<DbManager>,
) -> AppResult<ExportOutcome> {
    let format = ExportFormat::parse(&format)?;
    db.with_connection(|conn| match format {
        ExportFormat::Csv => export_rows_to_csv(conn, &params, &path),
        ExportFormat::Json => export_rows_to_json(conn, &params, &path),
    })
}
