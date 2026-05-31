use serde_json::{Map, Value as JsonValue};
use tauri::State;

use crate::db::query::{delete_row, insert_row, query_table, update_row, QueryParams, QueryResult};
use crate::db::DbManager;
use crate::error::AppResult;

#[tauri::command]
pub fn query_table_data(params: QueryParams, db: State<DbManager>) -> AppResult<QueryResult> {
    db.with_connection(|conn| query_table(conn, &params))
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
