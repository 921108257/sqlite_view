import type { PageSize, QueryFilter, QueryParams } from "@/types/database";

export const ALL_ROWS_BATCH_SIZE = 500;

export function buildTableQueryParams({
  table,
  currentPage,
  pageSize,
  orderBy,
  orderDir,
  filters,
  allRowsOffset = 0,
}: {
  table: string;
  currentPage: number;
  pageSize: PageSize;
  orderBy: string | null;
  orderDir: "ASC" | "DESC";
  filters: QueryFilter[];
  allRowsOffset?: number;
}): QueryParams {
  const paged = pageSize !== "all";

  return {
    table,
    limit: paged ? pageSize : ALL_ROWS_BATCH_SIZE,
    offset: paged ? currentPage * pageSize : allRowsOffset,
    order_by: orderBy ?? undefined,
    order_dir: orderBy ? orderDir : undefined,
    filters: filters.length ? filters : undefined,
  };
}
