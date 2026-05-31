import { invoke } from "@tauri-apps/api/core";
import type {
  TableInfo,
  ColumnInfo,
  QueryParams,
  QueryResult,
  CreateColumnDef,
  RowData,
} from "@/types/database";

// File commands
export async function openDatabase(path: string): Promise<void> {
  return invoke("open_database", { path });
}

export async function closeDatabase(): Promise<void> {
  return invoke("close_database");
}

export async function getDatabasePath(): Promise<string | null> {
  return invoke("get_database_path");
}

export async function isDatabaseConnected(): Promise<boolean> {
  return invoke("is_database_connected");
}

// Table commands
export async function listTables(): Promise<TableInfo[]> {
  return invoke("list_tables");
}

export async function getColumns(table: string): Promise<ColumnInfo[]> {
  return invoke("get_columns", { table });
}

export async function createNewTable(
  name: string,
  columns: CreateColumnDef[]
): Promise<void> {
  return invoke("create_new_table", { name, columns });
}

export async function deleteTable(name: string): Promise<void> {
  return invoke("delete_table", { name });
}

export async function renameExistingTable(
  oldName: string,
  newName: string
): Promise<void> {
  return invoke("rename_existing_table", { oldName, newName });
}

export async function addTableColumn(
  table: string,
  column: CreateColumnDef
): Promise<void> {
  return invoke("add_table_column", { table, column });
}

export async function dropTableColumn(
  table: string,
  column: string
): Promise<void> {
  return invoke("drop_table_column", { table, column });
}

// Data commands
export async function queryTableData(params: QueryParams): Promise<QueryResult> {
  return invoke("query_table_data", { params });
}

export async function insertTableRow(
  table: string,
  data: RowData
): Promise<number> {
  return invoke("insert_table_row", { table, data });
}

export async function updateTableRow(
  table: string,
  data: RowData,
  pkColumn: string,
  pkValue: unknown
): Promise<number> {
  return invoke("update_table_row", { table, data, pkColumn, pkValue });
}

export async function deleteTableRow(
  table: string,
  pkColumn: string,
  pkValue: unknown
): Promise<number> {
  return invoke("delete_table_row", { table, pkColumn, pkValue });
}
