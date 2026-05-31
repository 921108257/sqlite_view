import type { QueryResult } from "@/types/database";

export const JSON_VIEW_ROW_LIMIT = 1000;

export function buildJsonViewLines(queryResult: QueryResult) {
  const rows = queryResult.rows.slice(0, JSON_VIEW_ROW_LIMIT).map((row) => {
    const obj: Record<string, unknown> = {};
    queryResult.columns.forEach((column, index) => {
      obj[column] = row[index];
    });
    return obj;
  });

  return JSON.stringify(rows, null, 2).split("\n");
}
