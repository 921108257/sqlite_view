use rusqlite::{Connection, types::Value};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value as JsonValue};

use crate::error::{AppError, AppResult};

#[derive(Debug, Serialize, Deserialize)]
pub struct QueryResult {
    pub columns: Vec<String>,
    pub rows: Vec<Vec<JsonValue>>,
    pub total_count: i64,
}

#[derive(Debug, Deserialize)]
pub struct QueryParams {
    pub table: String,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
    pub order_by: Option<String>,
    pub order_dir: Option<String>,
}

fn sqlite_value_to_json(value: Value) -> JsonValue {
    match value {
        Value::Null => JsonValue::Null,
        Value::Integer(i) => JsonValue::Number(i.into()),
        Value::Real(f) => serde_json::Number::from_f64(f)
            .map(JsonValue::Number)
            .unwrap_or(JsonValue::Null),
        Value::Text(s) => JsonValue::String(s),
        Value::Blob(b) => JsonValue::String(format!("[BLOB: {} bytes]", b.len())),
    }
}

pub fn query_table(conn: &Connection, params: &QueryParams) -> AppResult<QueryResult> {
    // Get total count
    let count_sql = format!("SELECT COUNT(*) FROM \"{}\"", params.table);
    let total_count: i64 = conn.query_row(&count_sql, [], |row| row.get(0))?;

    // Build query
    let mut sql = format!("SELECT * FROM \"{}\"", params.table);

    if let Some(ref order_by) = params.order_by {
        let dir = params.order_dir.as_deref().unwrap_or("ASC");
        sql.push_str(&format!(" ORDER BY \"{}\" {}", order_by, dir));
    }

    if let Some(limit) = params.limit {
        sql.push_str(&format!(" LIMIT {}", limit));
    }

    if let Some(offset) = params.offset {
        sql.push_str(&format!(" OFFSET {}", offset));
    }

    let mut stmt = conn.prepare(&sql)?;
    let columns: Vec<String> = stmt
        .column_names()
        .iter()
        .map(|s| s.to_string())
        .collect();

    let column_count = columns.len();
    let rows: Vec<Vec<JsonValue>> = stmt
        .query_map([], |row| {
            let mut values = Vec::with_capacity(column_count);
            for i in 0..column_count {
                let value: Value = row.get(i)?;
                values.push(sqlite_value_to_json(value));
            }
            Ok(values)
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(QueryResult {
        columns,
        rows,
        total_count,
    })
}

pub fn insert_row(conn: &Connection, table: &str, data: &Map<String, JsonValue>) -> AppResult<i64> {
    if data.is_empty() {
        return Err(AppError::InvalidSql("No data provided".to_string()));
    }

    let columns: Vec<&str> = data.keys().map(|s| s.as_str()).collect();
    let placeholders: Vec<&str> = vec!["?"; columns.len()];

    let sql = format!(
        "INSERT INTO \"{}\" ({}) VALUES ({})",
        table,
        columns.iter().map(|c| format!("\"{}\"", c)).collect::<Vec<_>>().join(", "),
        placeholders.join(", ")
    );

    let values: Vec<Box<dyn rusqlite::ToSql>> = data
        .values()
        .map(|v| json_to_sql_value(v))
        .collect();

    let params: Vec<&dyn rusqlite::ToSql> = values.iter().map(|b| b.as_ref()).collect();
    conn.execute(&sql, params.as_slice())?;

    Ok(conn.last_insert_rowid())
}

pub fn update_row(
    conn: &Connection,
    table: &str,
    data: &Map<String, JsonValue>,
    pk_column: &str,
    pk_value: &JsonValue,
) -> AppResult<usize> {
    if data.is_empty() {
        return Err(AppError::InvalidSql("No data provided".to_string()));
    }

    let set_clause: Vec<String> = data
        .keys()
        .map(|k| format!("\"{}\" = ?", k))
        .collect();

    let sql = format!(
        "UPDATE \"{}\" SET {} WHERE \"{}\" = ?",
        table,
        set_clause.join(", "),
        pk_column
    );

    let mut values: Vec<Box<dyn rusqlite::ToSql>> = data
        .values()
        .map(|v| json_to_sql_value(v))
        .collect();
    values.push(json_to_sql_value(pk_value));

    let params: Vec<&dyn rusqlite::ToSql> = values.iter().map(|b| b.as_ref()).collect();
    let affected = conn.execute(&sql, params.as_slice())?;

    Ok(affected)
}

pub fn delete_row(
    conn: &Connection,
    table: &str,
    pk_column: &str,
    pk_value: &JsonValue,
) -> AppResult<usize> {
    let sql = format!("DELETE FROM \"{}\" WHERE \"{}\" = ?", table, pk_column);
    let value = json_to_sql_value(pk_value);
    let affected = conn.execute(&sql, [value.as_ref()])?;
    Ok(affected)
}

fn json_to_sql_value(value: &JsonValue) -> Box<dyn rusqlite::ToSql> {
    match value {
        JsonValue::Null => Box::new(Option::<String>::None),
        JsonValue::Bool(b) => Box::new(*b as i32),
        JsonValue::Number(n) => {
            if let Some(i) = n.as_i64() {
                Box::new(i)
            } else if let Some(f) = n.as_f64() {
                Box::new(f)
            } else {
                Box::new(n.to_string())
            }
        }
        JsonValue::String(s) => Box::new(s.clone()),
        _ => Box::new(value.to_string()),
    }
}
