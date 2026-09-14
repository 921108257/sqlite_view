import type { CellValue, QueryResult } from "@/types/database";
import { formatCellValue } from "@/components/data-view/table-helpers";

/** SQLite identifier quoting: double quotes, with embedded quotes doubled. */
export function quoteIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

/** SQLite string literal: single quotes, with embedded quotes doubled. */
export function quoteLiteral(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

export function cellToSqlLiteral(value: CellValue): string {
  if (value === null) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  return quoteLiteral(value);
}

export function formatCellForClipboard(value: CellValue) {
  return value === null ? "" : formatCellValue(value);
}

/**
 * Tab-separated row, the format spreadsheets paste into columns. Tabs and
 * newlines inside a value are escaped so they cannot fake a column boundary.
 */
export function rowToTsv(values: CellValue[]) {
  return values
    .map((value) =>
      formatCellForClipboard(value)
        .replace(/\t/g, "\\t")
        .replace(/\r?\n/g, "\\n")
    )
    .join("\t");
}

export function rowToInsertStatement(
  table: string,
  columns: string[],
  values: CellValue[]
) {
  const columnList = columns.map(quoteIdentifier).join(", ");
  const valueList = values.map(cellToSqlLiteral).join(", ");
  return `INSERT INTO ${quoteIdentifier(table)} (${columnList}) VALUES (${valueList});`;
}

export function rowValuesAt(queryResult: QueryResult, rowIndex: number): CellValue[] {
  const row = queryResult.rows[rowIndex] ?? [];
  return queryResult.columns.map((_, index) => toCellValue(row[index]));
}

function toCellValue(value: unknown): CellValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (value === undefined) return null;
  return String(value);
}

/** Write text to the clipboard, falling back to a hidden textarea + execCommand. */
export async function writeToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }
}
