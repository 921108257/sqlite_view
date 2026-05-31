import type { CellValue, PageSize } from "@/types/database";

export const COLUMN_MIN_WIDTH = 180;
export const FILTER_PANEL_WIDTH = 280;
export type FilterPanelSide = "left" | "right";

export function getTotalPages(totalCount: number, pageSize: PageSize) {
  if (pageSize === "all") return 1;
  return Math.max(1, Math.ceil(totalCount / pageSize));
}

export function resolveFilterPanelSide({
  triggerRight,
  triggerLeft,
  viewportWidth,
  panelWidth = FILTER_PANEL_WIDTH,
  margin = 16,
}: {
  triggerRight: number;
  triggerLeft: number;
  viewportWidth: number;
  panelWidth?: number;
  margin?: number;
}): FilterPanelSide {
  const availableRight = viewportWidth - triggerRight - margin;
  if (availableRight >= panelWidth) return "right";
  return triggerLeft >= panelWidth + margin ? "left" : "right";
}

export function uniqueCellValues(rows: unknown[][], columnIndex: number) {
  const values: CellValue[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const value = normalizeCellValue(row[columnIndex]);
    const key = JSON.stringify(value);
    if (seen.has(key)) continue;
    seen.add(key);
    values.push(value);
  }

  return values;
}

export function normalizeCellValue(value: unknown): CellValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  return String(value);
}

export function formatCellValue(value: CellValue) {
  if (value === null) return "NULL";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}
