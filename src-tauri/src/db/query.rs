use rusqlite::{types::Value, Connection, ToSql};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value as JsonValue};

use crate::error::{AppError, AppResult};

const MAX_UNLIMITED_QUERY_ROWS: i64 = 500;
/// Upper bound on the distinct values offered by a column filter popover.
const MAX_DISTINCT_VALUES: usize = 1000;

#[derive(Debug, Serialize, Deserialize)]
pub struct QueryResult {
    pub columns: Vec<String>,
    pub rows: Vec<Vec<JsonValue>>,
    pub total_count: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ColumnValues {
    pub values: Vec<JsonValue>,
    /// True when the table holds more distinct values than `MAX_DISTINCT_VALUES`.
    pub truncated: bool,
}

#[derive(Debug, Deserialize)]
pub struct QueryParams {
    pub table: String,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
    pub order_by: Option<String>,
    pub order_dir: Option<String>,
    pub filters: Option<Vec<QueryFilter>>,
    /// Case-insensitive substring matched against every column, OR'd together.
    pub global_search: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct QueryFilter {
    pub column: String,
    pub search: Option<String>,
    pub values: Option<Vec<JsonValue>>,
}

pub fn sqlite_value_to_json(value: Value) -> JsonValue {
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
    let (where_sql, filter_values) = build_filter_clause(
        conn,
        params.filters.as_deref(),
        params.global_search.as_deref(),
        &params.table,
    );
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

    let effective_limit = params.limit.unwrap_or(MAX_UNLIMITED_QUERY_ROWS);
    sql.push_str(&format!(" LIMIT {}", effective_limit));

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
) -> AppResult<ColumnValues> {
    let (where_sql, filter_values) = build_filter_clause(conn, filters, None, table);
    let column_sql = quote_identifier(column);
    let params = sql_param_refs(&filter_values);

    // The cap keeps the checkbox list bounded on huge tables. `truncated` is
    // reported so the UI can say so instead of silently hiding values.
    let mut stmt = conn.prepare(&format!(
        "SELECT DISTINCT {} FROM {}{} ORDER BY CAST({} AS TEXT) COLLATE NOCASE LIMIT {}",
        column_sql,
        quote_identifier(table),
        where_sql,
        column_sql,
        MAX_DISTINCT_VALUES
    ))?;

    let values = stmt
        .query_map(params.as_slice(), |row| {
            let value: Value = row.get(0)?;
            Ok(sqlite_value_to_json(value))
        })?
        .collect::<Result<Vec<_>, _>>()?;

    let distinct_count: i64 = conn.query_row(
        &format!("SELECT COUNT(DISTINCT {}) FROM {}{}", column_sql, quote_identifier(table), where_sql),
        params.as_slice(),
        |row| row.get(0),
    )?;

    Ok(ColumnValues {
        values,
        truncated: distinct_count > MAX_DISTINCT_VALUES as i64,
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

fn build_filter_clause(
    conn: &Connection,
    filters: Option<&[QueryFilter]>,
    global_search: Option<&str>,
    table: &str,
) -> (String, Vec<Box<dyn ToSql>>) {
    let mut clauses = Vec::new();
    let mut values: Vec<Box<dyn ToSql>> = Vec::new();

    for filter in filters.unwrap_or(&[]) {
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

    // Global search: one LIKE per column, OR'd, so the filter is pushed into
    // SQLite instead of being applied to an already-paginated page.
    if let Some(term) = global_search.map(str::trim).filter(|s| !s.is_empty()) {
        let columns = table_column_names(conn, table);
        if !columns.is_empty() {
            let any_column = columns
                .iter()
                .map(|column| format!("CAST({} AS TEXT) LIKE ?", quote_identifier(column)))
                .collect::<Vec<_>>()
                .join(" OR ");
            clauses.push(format!("({})", any_column));
            for _ in &columns {
                values.push(Box::new(format!("%{}%", term)));
            }
        }
    }

    if clauses.is_empty() {
        (String::new(), values)
    } else {
        (format!(" WHERE {}", clauses.join(" AND ")), values)
    }
}

/// Read the live column list so a global search never references a stale schema.
fn table_column_names(conn: &Connection, table: &str) -> Vec<String> {
    let quoted = quote_identifier(table);
    let Ok(mut stmt) = conn.prepare(&format!("PRAGMA table_info({})", quoted)) else {
        return Vec::new();
    };
    stmt.query_map([], |row| row.get::<_, String>(1))
        .and_then(|rows| rows.collect::<Result<Vec<_>, _>>())
        .unwrap_or_default()
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
                global_search: None,
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

        let result = get_column_values(
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

        assert_eq!(result.values, vec![json!("active"), json!("blocked")]);
        assert!(!result.truncated);
    }

    #[test]
    fn global_search_matches_any_column() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute(
            "CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT, note TEXT)",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO items (name, note) VALUES ('alpha', 'first')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO items (name, note) VALUES ('beta', 'needle here')",
            [],
        )
        .unwrap();

        let result = query_table(
            &conn,
            &QueryParams {
                table: "items".to_string(),
                limit: None,
                offset: None,
                order_by: Some("id".to_string()),
                order_dir: Some("ASC".to_string()),
                filters: None,
                global_search: Some("needle".to_string()),
            },
        )
        .unwrap();

        assert_eq!(result.total_count, 1);
        assert_eq!(result.rows[0][1], json!("beta"));
    }

    #[test]
    fn global_search_combines_with_column_filters() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute(
            "CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT, status TEXT)",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO items (name, status) VALUES ('apple', 'active')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO items (name, status) VALUES ('apple', 'blocked')",
            [],
        )
        .unwrap();

        let result = query_table(
            &conn,
            &QueryParams {
                table: "items".to_string(),
                limit: None,
                offset: None,
                order_by: None,
                order_dir: None,
                filters: Some(vec![QueryFilter {
                    column: "status".to_string(),
                    search: None,
                    values: Some(vec![json!("active")]),
                }]),
                global_search: Some("app".to_string()),
            },
        )
        .unwrap();

        assert_eq!(result.total_count, 1);
        assert_eq!(result.rows[0][2], json!("active"));
    }

    #[test]
    fn get_column_values_reports_truncation() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute("CREATE TABLE items (id INTEGER PRIMARY KEY, label TEXT)", [])
            .unwrap();
        for i in 0..(MAX_DISTINCT_VALUES + 5) {
            conn.execute(
                "INSERT INTO items (label) VALUES (?)",
                [format!("label-{}", i)],
            )
            .unwrap();
        }

        let result = get_column_values(&conn, "items", "label", None).unwrap();

        assert_eq!(result.values.len(), MAX_DISTINCT_VALUES);
        assert!(result.truncated);
    }

    #[test]
    fn query_table_caps_unlimited_queries() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute("CREATE TABLE items (id INTEGER PRIMARY KEY)", [])
            .unwrap();
        for _ in 0..5001 {
            conn.execute("INSERT INTO items DEFAULT VALUES", []).unwrap();
        }

        let result = query_table(
            &conn,
            &QueryParams {
                table: "items".to_string(),
                limit: None,
                offset: None,
                order_by: Some("id".to_string()),
                order_dir: Some("ASC".to_string()),
                filters: None,
                global_search: None,
            },
        )
        .unwrap();

        assert_eq!(result.total_count, 5001);
        assert_eq!(result.rows.len(), MAX_UNLIMITED_QUERY_ROWS as usize);
    }
}
