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

pub fn table_exists(conn: &Connection, table_name: &str) -> AppResult<bool> {
    let count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?",
        [table_name],
        |row| row.get(0),
    )?;
    Ok(count > 0)
}
