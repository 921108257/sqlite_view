use rusqlite::{Connection, Row};
use serde::{Deserialize, Serialize};

use crate::error::AppResult;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TableInfo {
    pub name: String,
    pub sql: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ColumnInfo {
    pub cid: i32,
    pub name: String,
    pub data_type: String,
    pub notnull: bool,
    pub default_value: Option<String>,
    pub pk: bool,
}

impl ColumnInfo {
    fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            cid: row.get(0)?,
            name: row.get(1)?,
            data_type: row.get::<_, String>(2).unwrap_or_default(),
            notnull: row.get::<_, i32>(3)? != 0,
            default_value: row.get(4)?,
            pk: row.get::<_, i32>(5)? != 0,
        })
    }
}

pub fn get_tables(conn: &Connection) -> AppResult<Vec<TableInfo>> {
    let mut stmt = conn.prepare(
        "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    )?;

    let tables = stmt
        .query_map([], |row| {
            Ok(TableInfo {
                name: row.get(0)?,
                sql: row.get(1)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(tables)
}

pub fn get_table_columns(conn: &Connection, table_name: &str) -> AppResult<Vec<ColumnInfo>> {
    let mut stmt = conn.prepare(&format!("PRAGMA table_info(\"{}\")", table_name))?;

    let columns = stmt
        .query_map([], |row| ColumnInfo::from_row(row))?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(columns)
}

#[derive(Debug, Deserialize)]
pub struct CreateColumnDef {
    pub name: String,
    pub data_type: String,
    pub notnull: bool,
    pub default_value: Option<String>,
    pub pk: bool,
}

pub fn create_table(
    conn: &Connection,
    table_name: &str,
    columns: &[CreateColumnDef],
) -> AppResult<()> {
    if columns.is_empty() {
        return Err(crate::error::AppError::InvalidSql(
            "At least one column is required".to_string(),
        ));
    }

    let column_defs: Vec<String> = columns
        .iter()
        .map(|col| {
            let mut def = format!("\"{}\" {}", col.name, col.data_type);
            if col.pk {
                def.push_str(" PRIMARY KEY");
            }
            if col.notnull && !col.pk {
                def.push_str(" NOT NULL");
            }
            if let Some(ref default) = col.default_value {
                def.push_str(&format!(" DEFAULT {}", default));
            }
            def
        })
        .collect();

    let sql = format!(
        "CREATE TABLE \"{}\" ({})",
        table_name,
        column_defs.join(", ")
    );

    conn.execute(&sql, [])?;
    Ok(())
}

pub fn drop_table(conn: &Connection, table_name: &str) -> AppResult<()> {
    let sql = format!("DROP TABLE \"{}\"", table_name);
    conn.execute(&sql, [])?;
    Ok(())
}

pub fn rename_table(conn: &Connection, old_name: &str, new_name: &str) -> AppResult<()> {
    let sql = format!("ALTER TABLE \"{}\" RENAME TO \"{}\"", old_name, new_name);
    conn.execute(&sql, [])?;
    Ok(())
}

pub fn add_column(conn: &Connection, table_name: &str, column: &CreateColumnDef) -> AppResult<()> {
    let mut def = format!("\"{}\" {}", column.name, column.data_type);
    if column.notnull {
        if let Some(ref default) = column.default_value {
            def.push_str(&format!(" NOT NULL DEFAULT {}", default));
        } else {
            return Err(crate::error::AppError::InvalidSql(
                "NOT NULL column requires a default value".to_string(),
            ));
        }
    }
    if let Some(ref default) = column.default_value {
        if !column.notnull {
            def.push_str(&format!(" DEFAULT {}", default));
        }
    }

    let sql = format!("ALTER TABLE \"{}\" ADD COLUMN {}", table_name, def);
    conn.execute(&sql, [])?;
    Ok(())
}

pub fn drop_column(conn: &Connection, table_name: &str, column_name: &str) -> AppResult<()> {
    let sql = format!(
        "ALTER TABLE \"{}\" DROP COLUMN \"{}\"",
        table_name, column_name
    );
    conn.execute(&sql, [])?;
    Ok(())
}
