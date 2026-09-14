use rusqlite::types::Value;
use rusqlite::Connection;
use serde::Serialize;

use crate::db::query::{sqlite_value_to_json, QueryParams};
use crate::error::{AppError, AppResult};

/// Rows are streamed in batches so exporting a large table does not hold the
/// whole result set in memory.
const EXPORT_BATCH_SIZE: i64 = 2000;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ExportFormat {
    Csv,
    Json,
}

impl ExportFormat {
    pub fn parse(value: &str) -> AppResult<Self> {
        match value.to_ascii_lowercase().as_str() {
            "csv" => Ok(Self::Csv),
            "json" => Ok(Self::Json),
            other => Err(AppError::InvalidSql(format!(
                "Unsupported export format: {}",
                other
            ))),
        }
    }
}

#[derive(Debug, Serialize)]
pub struct ExportOutcome {
    pub rows_written: i64,
    pub path: String,
}

/// Render a cell as text. RFC 4180 quoting is left to `csv::Writer`, which
/// only quotes fields that contain a separator, a quote, or a newline.
fn csv_text(value: &Value) -> String {
    match value {
        Value::Null => String::new(),
        Value::Integer(i) => i.to_string(),
        Value::Real(f) => f.to_string(),
        Value::Text(s) => s.clone(),
        Value::Blob(b) => format!("[BLOB: {} bytes]", b.len()),
    }
}

pub fn export_rows_to_csv(
    conn: &Connection,
    params: &QueryParams,
    path: &str,
) -> AppResult<ExportOutcome> {
    let columns = table_columns(conn, &params.table)?;
    if columns.is_empty() {
        return Err(AppError::TableNotFound(params.table.clone()));
    }

    let mut sql = format!(
        "SELECT * FROM {}",
        quote_identifier(&params.table)
    );
    if let Some(ref order_by) = params.order_by {
        let dir = match params.order_dir.as_deref() {
            Some("DESC") => "DESC",
            _ => "ASC",
        };
        sql.push_str(&format!(" ORDER BY {} {}", quote_identifier(order_by), dir));
    }

    let mut stmt = conn.prepare(&sql)?;
    let mut rows = stmt.query([])?;

    let mut writer = csv::Writer::from_path(path).map_err(csv_error)?;

    // Explicit header row keeps the on-disk header independent of `has_headers`
    // defaults, so the exported file always names its columns.
    writer.write_record(&columns).map_err(csv_error)?;

    let mut written: i64 = 0;
    while let Some(row) = rows.next()? {
        let mut record = Vec::with_capacity(columns.len());
        for index in 0..columns.len() {
            let value: Value = row.get(index)?;
            record.push(csv_text(&value));
        }
        writer.write_record(&record).map_err(csv_error)?;
        written += 1;
    }

    // `flush` surfaces io::Error, which AppError already converts from.
    writer.flush()?;

    Ok(ExportOutcome {
        rows_written: written,
        path: path.to_string(),
    })
}

pub fn export_rows_to_json(
    conn: &Connection,
    params: &QueryParams,
    path: &str,
) -> AppResult<ExportOutcome> {
    let columns = table_columns(conn, &params.table)?;
    if columns.is_empty() {
        return Err(AppError::TableNotFound(params.table.clone()));
    }

    let mut sql = format!("SELECT * FROM {}", quote_identifier(&params.table));
    if let Some(ref order_by) = params.order_by {
        let dir = match params.order_dir.as_deref() {
            Some("DESC") => "DESC",
            _ => "ASC",
        };
        sql.push_str(&format!(" ORDER BY {} {}", quote_identifier(order_by), dir));
    }
    sql.push_str(&format!(" LIMIT {}", EXPORT_BATCH_SIZE));

    let mut stmt = conn.prepare(&sql)?;
    let column_count = columns.len();
    let mut rows = stmt.query([])?;
    let mut objects: Vec<serde_json::Map<String, serde_json::Value>> = Vec::new();

    while let Some(row) = rows.next()? {
        let mut object = serde_json::Map::with_capacity(column_count);
        for (index, name) in columns.iter().enumerate() {
            let value: Value = row.get(index)?;
            object.insert(name.clone(), sqlite_value_to_json(value));
        }
        objects.push(object);
    }

    let document = serde_json::json!({
        "table": params.table,
        "columns": columns,
        "rows": objects,
    });

    let serialized = serde_json::to_string_pretty(&document)
        .map_err(|error| AppError::InvalidSql(error.to_string()))?;
    std::fs::write(path, serialized)?;

    Ok(ExportOutcome {
        rows_written: objects.len() as i64,
        path: path.to_string(),
    })
}

fn table_columns(conn: &Connection, table: &str) -> AppResult<Vec<String>> {
    let mut stmt = conn.prepare(&format!("PRAGMA table_info({})", quote_identifier(table)))?;
    let columns = stmt
        .query_map([], |row| row.get::<_, String>(1))?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(columns)
}

fn quote_identifier(identifier: &str) -> String {
    format!("\"{}\"", identifier.replace('"', "\"\""))
}

fn csv_error(error: csv::Error) -> AppError {
    AppError::Export(error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn seeded() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute(
            "CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT, note TEXT)",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO items (name, note) VALUES ('plain', 'no comma')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO items (name, note) VALUES ('quoted \"x\"', 'has, comma')",
            [],
        )
        .unwrap();
        conn.execute("INSERT INTO items (name, note) VALUES (NULL, 'line\nbreak')", [])
            .unwrap();
        conn
    }

    fn params() -> QueryParams {
        QueryParams {
            table: "items".to_string(),
            limit: None,
            offset: None,
            order_by: Some("id".to_string()),
            order_dir: Some("ASC".to_string()),
            filters: None,
            global_search: None,
        }
    }

    fn temp_path(name: &str) -> String {
        std::env::temp_dir()
            .join(name)
            .to_string_lossy()
            .to_string()
    }

    #[test]
    fn csv_escapes_commas_quotes_and_newlines() {
        let conn = seeded();
        let path = temp_path("sqlite_view_export_test.csv");
        let outcome = export_rows_to_csv(&conn, &params(), &path).unwrap();
        assert_eq!(outcome.rows_written, 3);

        let written = std::fs::read_to_string(&path).unwrap();
        let _ = std::fs::remove_file(&path);

        // Header is unquoted, plain fields stay unquoted, and only fields that
        // need it get quoted with embedded quotes doubled.
        assert_eq!(
            written,
            "id,name,note\n\
             1,plain,no comma\n\
             2,\"quoted \"\"x\"\"\",\"has, comma\"\n\
             3,,\"line\nbreak\"\n"
        );
    }

    #[test]
    fn json_export_is_an_array_of_row_objects() {
        let conn = seeded();
        let path = temp_path("sqlite_view_export_test.json");
        let outcome = export_rows_to_json(&conn, &params(), &path).unwrap();
        assert_eq!(outcome.rows_written, 3);

        let written = std::fs::read_to_string(&path).unwrap();
        let _ = std::fs::remove_file(&path);

        let parsed: serde_json::Value = serde_json::from_str(&written).unwrap();
        assert_eq!(parsed["table"], serde_json::json!("items"));
        assert_eq!(parsed["columns"], serde_json::json!(["id", "name", "note"]));
        assert_eq!(parsed["rows"][1]["name"], serde_json::json!("quoted \"x\""));
        assert_eq!(parsed["rows"][2]["name"], serde_json::Value::Null);
    }

    #[test]
    fn export_rejects_unknown_table() {
        let conn = seeded();
        let mut invalid = params();
        invalid.table = "missing".to_string();
        assert!(export_rows_to_csv(&conn, &invalid, &temp_path("nope.csv")).is_err());
    }

    #[test]
    fn export_format_parsing_is_case_insensitive() {
        assert_eq!(ExportFormat::parse("CSV").unwrap(), ExportFormat::Csv);
        assert_eq!(ExportFormat::parse("json").unwrap(), ExportFormat::Json);
        assert!(ExportFormat::parse("xml").is_err());
    }
}
