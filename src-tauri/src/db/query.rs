use rusqlite::{types::Value, Connection, ToSql};
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
    pub filters: Option<Vec<QueryFilter>>,
}

#[derive(Debug, Deserialize)]
pub struct QueryFilter {
    pub column: String,
    pub search: Option<String>,
    pub values: Option<Vec<JsonValue>>,
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
    let (where_sql, filter_values) = build_filter_clause(params.filters.as_deref());
    let filter_params = sql_param_refs(&filter_values);

    let count_sql = format!(
        "SELECT COUNT(*) FROM {}{}",
        quote_identifier(&params.table),
        where_sql
    );
    let total_count: i64 =
        conn.query_row(&count_sql, filter_params.as_slice(), |row| row.get(0))?;

    let mut sql = format!(
        "SELECT * FROM {}{}",
        quote_identifier(&params.table),
        where_sql
    );

    if let Some(ref order_by) = params.order_by {
        let dir = match params.order_dir.as_deref() {
            Some("DESC") => "DESC",
            _ => "ASC",
        };
        sql.push_str(&format!(" ORDER BY {} {}", quote_identifier(order_by), dir));
    }

    if let Some(limit) = params.limit {
        sql.push_str(&format!(" LIMIT {}", limit));
    }

    if let Some(offset) = params.offset {
        sql.push_str(&format!(" OFFSET {}", offset));
    }

    let mut stmt = conn.prepare(&sql)?;
    let columns: Vec<String> = stmt.column_names().iter().map(|s| s.to_string()).collect();

    let column_count = columns.len();
    let query_params = sql_param_refs(&filter_values);
    let rows: Vec<Vec<JsonValue>> = stmt
        .query_map(query_params.as_slice(), |row| {
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

pub fn get_column_values(
    conn: &Connection,
    table: &str,
    column: &str,
    filters: Option<&[QueryFilter]>,
) -> AppResult<Vec<JsonValue>> {
    let (where_sql, filter_values) = build_filter_clause(filters);
    let column_sql = quote_identifier(column);
    let sql = format!(
        "SELECT DISTINCT {} FROM {}{} ORDER BY CAST({} AS TEXT) COLLATE NOCASE LIMIT 1000",
        column_sql,
        quote_identifier(table),
        where_sql,
        column_sql
    );

    let params = sql_param_refs(&filter_values);
    let mut stmt = conn.prepare(&sql)?;
    let values = stmt
        .query_map(params.as_slice(), |row| {
            let value: Value = row.get(0)?;
            Ok(sqlite_value_to_json(value))
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(values)
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
        columns
            .iter()
            .map(|c| format!("\"{}\"", c))
            .collect::<Vec<_>>()
            .join(", "),
        placeholders.join(", ")
    );

    let values: Vec<Box<dyn rusqlite::ToSql>> =
        data.values().map(|v| json_to_sql_value(v)).collect();

    let params: Vec<&dyn rusqlite::ToSql> = values.iter().map(|b| b.as_ref()).collect();
    conn.execute(&sql, params.as_slice())?;

    Ok(conn.last_insert_rowid())
}

pub fn clear_table(conn: &Connection, table: &str) -> AppResult<usize> {
    let sql = format!("DELETE FROM {}", quote_identifier(table));
    Ok(conn.execute(&sql, [])?)
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

    let set_clause: Vec<String> = data.keys().map(|k| format!("\"{}\" = ?", k)).collect();

    let sql = format!(
        "UPDATE \"{}\" SET {} WHERE \"{}\" = ?",
        table,
        set_clause.join(", "),
        pk_column
    );

    let mut values: Vec<Box<dyn rusqlite::ToSql>> =
        data.values().map(|v| json_to_sql_value(v)).collect();
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

pub fn delete_rows(
    conn: &Connection,
    table: &str,
    pk_column: &str,
    pk_values: &[JsonValue],
) -> AppResult<usize> {
    if pk_values.is_empty() {
        return Ok(0);
    }

    let placeholders = vec!["?"; pk_values.len()].join(", ");
    let sql = format!(
        "DELETE FROM {} WHERE {} IN ({})",
        quote_identifier(table),
        quote_identifier(pk_column),
        placeholders
    );
    let values: Vec<Box<dyn ToSql>> = pk_values.iter().map(json_to_sql_value).collect();
    let params = sql_param_refs(&values);

    Ok(conn.execute(&sql, params.as_slice())?)
}

fn build_filter_clause(filters: Option<&[QueryFilter]>) -> (String, Vec<Box<dyn ToSql>>) {
    let Some(filters) = filters else {
        return (String::new(), Vec::new());
    };

    let mut clauses = Vec::new();
    let mut values: Vec<Box<dyn ToSql>> = Vec::new();

    for filter in filters {
        if let Some(search) = filter
            .search
            .as_deref()
            .map(str::trim)
            .filter(|s| !s.is_empty())
        {
            clauses.push(format!(
                "CAST({} AS TEXT) LIKE ?",
                quote_identifier(&filter.column)
            ));
            values.push(Box::new(format!("%{}%", search)));
        }

        let checked_values: Vec<&JsonValue> =
            filter.values.as_deref().unwrap_or(&[]).iter().collect();

        if !checked_values.is_empty() {
            let placeholders = vec!["?"; checked_values.len()].join(", ");
            clauses.push(format!(
                "{} IN ({})",
                quote_identifier(&filter.column),
                placeholders
            ));
            values.extend(checked_values.into_iter().map(json_to_sql_value));
        }
    }

    if clauses.is_empty() {
        (String::new(), values)
    } else {
        (format!(" WHERE {}", clauses.join(" AND ")), values)
    }
}

fn sql_param_refs(values: &[Box<dyn ToSql>]) -> Vec<&dyn ToSql> {
    values.iter().map(|value| value.as_ref()).collect()
}

fn quote_identifier(identifier: &str) -> String {
    format!("\"{}\"", identifier.replace('"', "\"\""))
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

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn query_table_intersects_like_search_and_checked_values() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute(
            "CREATE TABLE items (id INTEGER PRIMARY KEY, status TEXT)",
            [],
        )
        .unwrap();
        conn.execute("INSERT INTO items (status) VALUES ('active')", [])
            .unwrap();
        conn.execute("INSERT INTO items (status) VALUES ('inactive')", [])
            .unwrap();
        conn.execute("INSERT INTO items (status) VALUES ('blocked')", [])
            .unwrap();

        let result = query_table(
            &conn,
            &QueryParams {
                table: "items".to_string(),
                limit: None,
                offset: None,
                order_by: Some("id".to_string()),
                order_dir: Some("ASC".to_string()),
                filters: Some(vec![QueryFilter {
                    column: "status".to_string(),
                    search: Some("ac".to_string()),
                    values: Some(vec![json!("active"), json!("blocked")]),
                }]),
            },
        )
        .unwrap();

        assert_eq!(result.total_count, 1);
        assert_eq!(result.rows[0][1], json!("active"));
    }

    #[test]
    fn get_column_values_applies_supplied_filters() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute(
            "CREATE TABLE items (id INTEGER PRIMARY KEY, category TEXT, status TEXT)",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO items (category, status) VALUES ('fruit', 'active')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO items (category, status) VALUES ('fruit', 'blocked')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO items (category, status) VALUES ('tool', 'active')",
            [],
        )
        .unwrap();

        let values = get_column_values(
            &conn,
            "items",
            "status",
            Some(&[QueryFilter {
                column: "category".to_string(),
                search: Some("fr".to_string()),
                values: None,
            }]),
        )
        .unwrap();

        assert_eq!(values, vec![json!("active"), json!("blocked")]);
    }
}
