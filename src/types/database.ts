export interface TableInfo {
  name: string;
  sql: string | null;
}

export interface ColumnInfo {
  cid: number;
  name: string;
  data_type: string;
  notnull: boolean;
  default_value: string | null;
  pk: boolean;
}

export interface QueryParams {
  table: string;
  limit?: number;
  offset?: number;
  order_by?: string;
  order_dir?: "ASC" | "DESC";
  filters?: QueryFilter[];
  /** Case-insensitive substring match OR'd across every column. */
  global_search?: string;
}

export interface QueryFilter {
  column: string;
  search?: string;
  values?: CellValue[];
}

export interface QueryResult {
  columns: string[];
  rows: unknown[][];
  total_count: number;
}

export interface ColumnValues {
  values: CellValue[];
  /** True when the table holds more distinct values than the backend returns. */
  truncated: boolean;
}

export interface CreateColumnDef {
  name: string;
  data_type: string;
  notnull: boolean;
  default_value: string | null;
  pk: boolean;
}

export type CellValue = string | number | boolean | null;

export type PageSize = 50 | 100 | 500 | 1000 | "all";

export interface RowData {
  [key: string]: CellValue;
}
