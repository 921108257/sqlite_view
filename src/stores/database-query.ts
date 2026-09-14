import type { PageSize, QueryFilter, QueryParams } from "@/types/database";

export const ALL_ROWS_BATCH_SIZE = 500;

export function buildTableQueryParams({
  table,
  currentPage,
  pageSize,
  orderBy,
  orderDir,
  filters,
  globalSearch,
  allRowsOffset = 0,
}: {
  table: string;
  currentPage: number;
  pageSize: PageSize;
  orderBy: string | null;
  orderDir: "ASC" | "DESC";
  filters: QueryFilter[];
  globalSearch?: string;
  allRowsOffset?: number;
}): QueryParams {
  const paged = pageSize !== "all";
  const trimmedSearch = globalSearch?.trim();

  return {
    table,
    limit: paged ? pageSize : ALL_ROWS_BATCH_SIZE,
    offset: paged ? currentPage * pageSize : allRowsOffset,
    order_by: orderBy ?? undefined,
    order_dir: orderBy ? orderDir : undefined,
    filters: filters.length ? filters : undefined,
    global_search: trimmedSearch ? trimmedSearch : undefined,
  };
}
