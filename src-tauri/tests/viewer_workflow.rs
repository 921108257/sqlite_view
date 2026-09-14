//! End-to-end exercise of the command layer against a real on-disk database.
//! These tests cover the paths the UI drives: open, inspect, query, mutate,
//! search, filter, and export.

use rusqlite::Connection;

use sqlite_view_lib::db::export::{export_rows_to_csv, export_rows_to_json};
use sqlite_view_lib::db::query::{
    clear_table, delete_row, delete_rows, get_column_values, insert_row, query_table, update_row,
    QueryFilter, QueryParams,
};
use sqlite_view_lib::db::schema::{add_column, create_table, get_table_columns, get_tables, CreateColumnDef};

fn temp_db(name: &str) -> String {
    let path = std::env::temp_dir().join(name);
    let _ = std::fs::remove_file(&path);
    path.to_string_lossy().to_string()
}

fn seed(path: &str) {
    let conn = Connection::open(path).unwrap();
    create_table(
        &conn,
        "users",
        &[
            CreateColumnDef {
                name: "id".into(),
                data_type: "INTEGER".into(),
                notnull: false,
                default_value: None,
                pk: true,
            },
            CreateColumnDef {
                name: "name".into(),
                data_type: "TEXT".into(),
                notnull: false,
                default_value: None,
                pk: false,
            },
            CreateColumnDef {
                name: "email".into(),
                data_type: "TEXT".into(),
                notnull: false,
                default_value: None,
                pk: false,
            },
        ],
    )
    .unwrap();

    let mut data = serde_json::Map::new();
    data.insert("name".into(), serde_json::json!("Ada Lovelace"));
    data.insert("email".into(), serde_json::json!("ada@example.com"));
    insert_row(&conn, "users", &data).unwrap();

    let mut data = serde_json::Map::new();
    data.insert("name".into(), serde_json::json!("Grace Hopper"));
    data.insert("email".into(), serde_json::json!("grace@example.com"));
    insert_row(&conn, "users", &data).unwrap();
}

fn params(table: &str) -> QueryParams {
    QueryParams {
        table: table.into(),
        limit: None,
        offset: None,
        order_by: Some("id".into()),
        order_dir: Some("ASC".into()),
        filters: None,
        global_search: None,
    }
}

#[test]
fn full_viewer_workflow_on_a_real_database_file() {
    let path = temp_db("sqlite_view_e2e.db");
    seed(&path);
    let conn = Connection::open(&path).unwrap();

    // 1. The sidebar lists the table.
    let tables = get_tables(&conn).unwrap();
    assert_eq!(tables.len(), 1);
    assert_eq!(tables[0].name, "users");

    // 2. Selecting it loads column metadata for the grid and edit dialog.
    let columns = get_table_columns(&conn, "users").unwrap();
    let names: Vec<&str> = columns.iter().map(|c| c.name.as_str()).collect();
    assert_eq!(names, vec!["id", "name", "email"]);
    assert!(columns[0].pk, "id should be detected as the primary key");

    // 3. The grid loads rows.
    let result = query_table(&conn, &params("users")).unwrap();
    assert_eq!(result.total_count, 2);
    assert_eq!(result.rows.len(), 2);

    // 4. Global search narrows across columns (the toolbar search box).
    let mut search = params("users");
    search.global_search = Some("grace".into());
    assert_eq!(query_table(&conn, &search).unwrap().total_count, 1);

    // A search that matches only the email column still matches (OR across columns).
    let mut search = params("users");
    search.global_search = Some("ada@example".into());
    assert_eq!(query_table(&conn, &search).unwrap().total_count, 1);

    // 5. Per-column filter popover values are populated and not truncated.
    let values = get_column_values(&conn, "users", "name", None).unwrap();
    assert_eq!(values.values.len(), 2);
    assert!(!values.truncated);

    // 6. Inline cell edit commits via the primary key.
    let mut update = serde_json::Map::new();
    update.insert("name".into(), serde_json::json!("Ada King"));
    assert_eq!(update_row(&conn, "users", &update, "id", &serde_json::json!(1)).unwrap(), 1);
    let result = query_table(&conn, &params("users")).unwrap();
    assert_eq!(result.rows[0][1], serde_json::json!("Ada King"));

    // 7. Adding a column (previously unreachable from the UI) works.
    add_column(
        &conn,
        "users",
        &CreateColumnDef {
            name: "nickname".into(),
            data_type: "TEXT".into(),
            notnull: false,
            default_value: None,
            pk: false,
        },
    )
    .unwrap();
    let columns = get_table_columns(&conn, "users").unwrap();
    assert_eq!(columns.len(), 4);

    // 8. Export writes the whole table, not just one page.
    let csv_path = temp_db("sqlite_view_e2e.csv");
    let outcome = export_rows_to_csv(&conn, &params("users"), &csv_path).unwrap();
    assert_eq!(outcome.rows_written, 2);
    let csv = std::fs::read_to_string(&csv_path).unwrap();
    assert!(csv.starts_with("id,name,email,nickname\n"), "csv header was: {:?}", csv.lines().next());

    let json_path = temp_db("sqlite_view_e2e.json");
    let outcome = export_rows_to_json(&conn, &params("users"), &json_path).unwrap();
    assert_eq!(outcome.rows_written, 2);
    let parsed: serde_json::Value =
        serde_json::from_str(&std::fs::read_to_string(&json_path).unwrap()).unwrap();
    assert_eq!(parsed["rows"][0]["name"], serde_json::json!("Ada King"));

    // 9. Deleting selected rows (multi-select toolbar action).
    assert_eq!(
        delete_rows(&conn, "users", "id", &[serde_json::json!(2)]).unwrap(),
        1
    );
    assert_eq!(query_table(&conn, &params("users")).unwrap().total_count, 1);

    // 10. Clearing the table leaves the schema intact.
    assert_eq!(clear_table(&conn, "users").unwrap(), 1);
    assert_eq!(query_table(&conn, &params("users")).unwrap().total_count, 0);
    assert_eq!(get_table_columns(&conn, "users").unwrap().len(), 4);

    // 11. A filtered + searched export honours the active query, not the page.
    let mut filtered = params("users");
    filtered.filters = Some(vec![QueryFilter {
        column: "name".into(),
        search: None,
        values: Some(vec![serde_json::json!("nobody")]),
    }]);
    assert_eq!(query_table(&conn, &filtered).unwrap().total_count, 0);

    let _ = std::fs::remove_file(&path);
    let _ = std::fs::remove_file(&csv_path);
    let _ = std::fs::remove_file(&json_path);
}

#[test]
fn delete_row_removes_exactly_one_row() {
    let path = temp_db("sqlite_view_e2e_row.db");
    seed(&path);
    let conn = Connection::open(&path).unwrap();

    assert_eq!(
        delete_row(&conn, "users", "id", &serde_json::json!(1)).unwrap(),
        1
    );
    let result = query_table(&conn, &params("users")).unwrap();
    assert_eq!(result.total_count, 1);
    assert_eq!(result.rows[0][1], serde_json::json!("Grace Hopper"));

    let _ = std::fs::remove_file(&path);
}
