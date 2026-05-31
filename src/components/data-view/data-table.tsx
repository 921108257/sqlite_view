import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Edit3,
  Eraser,
  Trash2,
} from "lucide-react";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/dialogs/delete-confirm-dialog";
import { EditRowDialog } from "@/components/dialogs/edit-row-dialog";
import { useDatabaseStore } from "@/stores/database-store";
import {
  clearTableData,
  deleteTableRow,
  deleteTableRows,
} from "@/tauri/commands";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ColumnHeader } from "./column-header";
import { ColumnFilterPopover } from "./column-filter-popover";
import {
  COLUMN_MIN_WIDTH,
  formatCellValue,
  getTotalPages,
  normalizeCellValue,
  resolveFilterPanelSide,
  type FilterPanelSide,
} from "./table-helpers";
import type { CellValue, PageSize, RowData } from "@/types/database";

const SELECT_COLUMN_WIDTH = 42;

type DeleteTarget =
  | { type: "row"; pkValue: CellValue }
  | { type: "selected"; pkValues: CellValue[] }
  | { type: "clear" };

interface ContextMenuState {
  x: number;
  y: number;
  rowIndex: number;
}

interface FilterPanelState {
  column: string;
  anchor: {
    left: number;
    right: number;
    top: number;
    bottom: number;
    side: FilterPanelSide;
  };
}

export function DataTable() {
  const {
    queryResult,
    tableColumns,
    selectedTable,
    currentPage,
    pageSize,
    orderBy,
    orderDir,
    filters,
    setPage,
    setPageSize,
    refreshData,
    isLoading,
  } = useDatabaseStore();
  const { toast } = useToast();
  const { t } = useI18n();

  const [rowToEdit, setRowToEdit] = useState<{
    rowData: RowData;
    pkValue: CellValue;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Record<string, CellValue>>({});
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [filterPanel, setFilterPanel] = useState<FilterPanelState | null>(null);

  const pkColumn = tableColumns.find((column) => column.pk);
  const pkColumnIndex = pkColumn && queryResult
    ? queryResult.columns.indexOf(pkColumn.name)
    : -1;
  const rows = queryResult?.rows ?? [];
  const columns = queryResult?.columns ?? [];
  const columnsKey = columns.join("\u0000");
  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    if (!columns.length) return;

    setColumnWidths((previous) => {
      const next: Record<string, number> = {};
      columns.forEach((column) => {
        next[column] = Math.max(previous[column] ?? COLUMN_MIN_WIDTH, COLUMN_MIN_WIDTH);
      });
      return next;
    });
  }, [columnsKey, columns]);

  useEffect(() => {
    setSelectedRows({});
  }, [selectedTable, currentPage, pageSize, orderBy, orderDir, filtersKey]);

  useEffect(() => {
    if (!contextMenu) return;

    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("blur", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("blur", close);
    };
  }, [contextMenu]);

  const totalPages = getTotalPages(queryResult?.total_count ?? 0, pageSize);
  const selectedCount = Object.keys(selectedRows).length;
  const tableWidth =
    SELECT_COLUMN_WIDTH +
    columns.reduce(
      (total, column) => total + (columnWidths[column] ?? COLUMN_MIN_WIDTH),
      0
    );

  const visibleSelectionKeys = useMemo(() => {
    if (!pkColumn || pkColumnIndex < 0) return [];
    return rows.map((row) => rowSelectionKey(normalizeCellValue(row[pkColumnIndex])));
  }, [pkColumn, pkColumnIndex, rows]);

  const allVisibleSelected =
    visibleSelectionKeys.length > 0 &&
    visibleSelectionKeys.every((key) => selectedRows[key] !== undefined);
  const hasVisibleSelection = visibleSelectionKeys.some(
    (key) => selectedRows[key] !== undefined
  );

  const getRowPkValue = useCallback(
    (rowIndex: number) => {
      if (!queryResult || pkColumnIndex < 0) return null;
      return normalizeCellValue(queryResult.rows[rowIndex]?.[pkColumnIndex]);
    },
    [pkColumnIndex, queryResult]
  );

  const toggleRowSelection = (rowIndex: number) => {
    if (!pkColumn) return;
    const pkValue = getRowPkValue(rowIndex);
    if (pkValue === null && pkColumnIndex < 0) return;
    const key = rowSelectionKey(pkValue);

    setSelectedRows((previous) => {
      const next = { ...previous };
      if (next[key] !== undefined) {
        delete next[key];
      } else {
        next[key] = pkValue;
      }
      return next;
    });
  };

  const toggleAllVisibleRows = () => {
    if (!pkColumn || pkColumnIndex < 0) return;

    setSelectedRows((previous) => {
      const next = { ...previous };
      if (allVisibleSelected) {
        visibleSelectionKeys.forEach((key) => {
          delete next[key];
        });
      } else {
        rows.forEach((row) => {
          const pkValue = normalizeCellValue(row[pkColumnIndex]);
          next[rowSelectionKey(pkValue)] = pkValue;
        });
      }
      return next;
    });
  };

  const handleDeleteRow = (rowIndex: number) => {
    if (!pkColumn) return;
    const pkValue = getRowPkValue(rowIndex);
    if (pkValue === null && pkColumnIndex < 0) return;
    setDeleteTarget({ type: "row", pkValue });
  };

  const handleEditRow = (rowIndex: number) => {
    if (!pkColumn || !queryResult || pkColumnIndex < 0) return;
    const row = queryResult.rows[rowIndex];
    const pkValue = normalizeCellValue(row[pkColumnIndex]);
    const rowData: RowData = {};

    queryResult.columns.forEach((column, index) => {
      rowData[column] = normalizeCellValue(row[index]);
    });

    setRowToEdit({ rowData, pkValue });
  };

  const handleDeleteSelected = () => {
    if (!pkColumn || !selectedCount) return;
    setDeleteTarget({
      type: "selected",
      pkValues: Object.values(selectedRows),
    });
  };

  const confirmDelete = async () => {
    if (!selectedTable || !deleteTarget) return;
    if (deleteTarget.type !== "clear" && !pkColumn) return;

    setIsDeleting(true);
    try {
      if (deleteTarget.type === "row") {
        await deleteTableRow(selectedTable, pkColumn!.name, deleteTarget.pkValue);
      } else if (deleteTarget.type === "selected") {
        await deleteTableRows(selectedTable, pkColumn!.name, deleteTarget.pkValues);
      } else {
        await clearTableData(selectedTable);
      }

      await refreshData();
      setSelectedRows({});
      setDeleteTarget(null);
      toast({
        title: t("common.success"),
        description:
          deleteTarget.type === "clear"
            ? t("data.tableCleared")
            : t("data.rowDeleted"),
      });
    } catch (e) {
      toast({
        title: t("common.error"),
        description: String(e),
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const openContextMenu = (
    event: ReactMouseEvent,
    rowIndex: number
  ) => {
    event.preventDefault();
    setContextMenu({
      x: Math.min(event.clientX, window.innerWidth - 160),
      y: Math.min(event.clientY, window.innerHeight - 96),
      rowIndex,
    });
  };

  const editContextRow = () => {
    if (!contextMenu || !pkColumn) return;
    handleEditRow(contextMenu.rowIndex);
    setContextMenu(null);
  };

  const deleteContextRow = () => {
    if (!contextMenu || !pkColumn) return;
    handleDeleteRow(contextMenu.rowIndex);
    setContextMenu(null);
  };

  const handleFilterClick = (
    event: ReactMouseEvent<HTMLButtonElement>,
    column: string
  ) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const side = resolveFilterPanelSide({
      triggerRight: rect.right,
      triggerLeft: rect.left,
      viewportWidth: window.innerWidth,
    });

    setFilterPanel({
      column,
      anchor: {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        side,
      },
    });
  };

  const startResize = (
    event: ReactMouseEvent<HTMLButtonElement>,
    column: string
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = columnWidths[column] ?? COLUMN_MIN_WIDTH;

    const handleMove = (moveEvent: MouseEvent) => {
      const width = Math.max(
        COLUMN_MIN_WIDTH,
        startWidth + moveEvent.clientX - startX
      );
      setColumnWidths((previous) => ({ ...previous, [column]: width }));
    };
    const handleUp = () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  };

  if (!queryResult) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">{t("data.loading")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-background">
      <div className="flex items-center justify-between gap-3 border-b bg-muted/20 px-2 py-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-sm px-2"
            onClick={() => setDeleteTarget({ type: "clear" })}
            disabled={isLoading || queryResult.total_count === 0}
          >
            <Eraser className="mr-1.5 h-3.5 w-3.5" />
            {t("data.clearTable")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-sm px-2"
            onClick={handleDeleteSelected}
            disabled={!pkColumn || selectedCount === 0 || isLoading}
            title={
              !pkColumn ? t("data.deleteSelectedDisabledNoPrimaryKey") : undefined
            }
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            {t("data.deleteSelected")}
          </Button>
          {selectedCount > 0 && (
            <span className="font-mono text-xs text-muted-foreground">
              {t("data.selectedCount", { count: selectedCount })}
            </span>
          )}
        </div>
        {!pkColumn && (
          <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
            {t("data.noPrimaryKeyRowActionsDisabled")}
          </span>
        )}
      </div>

      <div className="sqlite-table-scroll flex-1 overflow-auto">
        <table
          className="min-w-full table-fixed border-separate border-spacing-0 text-sm"
          style={{ minWidth: tableWidth }}
        >
          <colgroup>
            <col style={{ width: SELECT_COLUMN_WIDTH }} />
            {columns.map((column) => (
              <col
                key={column}
                style={{ width: columnWidths[column] ?? COLUMN_MIN_WIDTH }}
              />
            ))}
          </colgroup>
          <TableHeader className="sticky top-0 z-20 bg-background">
            <TableRow className="hover:bg-transparent">
              <TableHead className="sticky left-0 z-30 h-9 border-b border-r bg-background p-0 text-center">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  disabled={!pkColumn || rows.length === 0}
                  onChange={toggleAllVisibleRows}
                  aria-checked={hasVisibleSelection && !allVisibleSelected ? "mixed" : allVisibleSelected}
                  className="h-4 w-4 accent-primary disabled:opacity-40"
                />
              </TableHead>
              {columns.map((column) => (
                <TableHead
                  key={column}
                  className="h-9 border-b border-r bg-background p-0"
                  style={{
                    minWidth: COLUMN_MIN_WIDTH,
                    width: columnWidths[column] ?? COLUMN_MIN_WIDTH,
                  }}
                >
                  <ColumnHeader
                    column={column}
                    filtered={filters.some((filter) => filter.column === column)}
                    onFilterClick={(event) => handleFilterClick(event, column)}
                    onResizeStart={(event) => startResize(event, column)}
                  />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, rowIndex) => {
              const pkValue = getRowPkValue(rowIndex);
              const selected =
                pkColumn && pkValue !== null
                  ? selectedRows[rowSelectionKey(pkValue)] !== undefined
                  : false;

              return (
                <TableRow
                  key={`${rowIndex}-${pkValue ?? "row"}`}
                  data-state={selected ? "selected" : undefined}
                  className="group hover:bg-muted/40"
                  onContextMenu={(event) => openContextMenu(event, rowIndex)}
                >
                  <TableCell className="sticky left-0 z-10 border-b border-r bg-background p-0 text-center group-hover:bg-muted/40">
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={!pkColumn}
                      onChange={() => toggleRowSelection(rowIndex)}
                      onClick={(event) => event.stopPropagation()}
                      className="h-4 w-4 accent-primary disabled:opacity-40"
                    />
                  </TableCell>
                  {columns.map((column, colIndex) => {
                    const value = normalizeCellValue(row[colIndex]);

                    return (
                      <TableCell
                        key={column}
                        className="h-8 border-b border-r px-2 py-1 align-middle"
                        style={{
                          minWidth: COLUMN_MIN_WIDTH,
                          width: columnWidths[column] ?? COLUMN_MIN_WIDTH,
                          maxWidth: columnWidths[column] ?? COLUMN_MIN_WIDTH,
                        }}
                        onContextMenu={(event) =>
                          openContextMenu(event, rowIndex)
                        }
                      >
                        <div
                          className={cn(
                            "min-w-0 cursor-cell truncate rounded-sm px-1 py-0.5 font-mono text-xs hover:bg-muted",
                            value === null && "italic text-muted-foreground"
                          )}
                          title={formatCellValue(value)}
                          onDoubleClick={() => handleEditRow(rowIndex)}
                        >
                          {formatCellValue(value)}
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3 border-t bg-muted/10 px-2 py-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {t("data.rowsTotal", { count: queryResult.total_count })}
          </span>
          <select
            value={String(pageSize)}
            onChange={(event) => setPageSize(parsePageSize(event.target.value))}
            className="h-8 rounded-sm border border-input bg-background px-2 font-mono text-xs outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="500">500</option>
            <option value="1000">1000</option>
            <option value="all">{t("data.pageSizeAll")}</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {t("data.pageOf", {
              page: pageSize === "all" ? 1 : currentPage + 1,
              total: totalPages,
            })}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-sm"
              onClick={() => setPage(0)}
              disabled={currentPage === 0 || isLoading || pageSize === "all"}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-sm"
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage === 0 || isLoading || pageSize === "all"}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-sm"
              onClick={() => setPage(currentPage + 1)}
              disabled={
                currentPage >= totalPages - 1 || isLoading || pageSize === "all"
              }
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-sm"
              onClick={() => setPage(totalPages - 1)}
              disabled={
                currentPage >= totalPages - 1 || isLoading || pageSize === "all"
              }
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {contextMenu && (
        <div
          className="fixed z-50 w-40 rounded-md border bg-popover p-1 text-popover-foreground shadow-lg"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
            onClick={editContextRow}
            disabled={!pkColumn}
          >
            <Edit3 className="h-3.5 w-3.5" />
            {t("common.modify")}
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10 disabled:pointer-events-none disabled:opacity-50"
            onClick={deleteContextRow}
            disabled={!pkColumn}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t("common.delete")}
          </button>
        </div>
      )}

      {filterPanel && (
        <ColumnFilterPopover
          column={filterPanel.column}
          anchor={filterPanel.anchor}
          onClose={() => setFilterPanel(null)}
        />
      )}

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={getDeleteTitle(deleteTarget, t)}
        description={getDeleteDescription(deleteTarget, selectedTable, t)}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
      />
      <EditRowDialog
        open={rowToEdit !== null}
        onOpenChange={(open) => {
          if (!open) setRowToEdit(null);
        }}
        rowData={rowToEdit?.rowData ?? null}
        pkColumnName={pkColumn?.name ?? null}
        pkValue={rowToEdit?.pkValue ?? null}
      />
    </div>
  );
}

function parsePageSize(value: string): PageSize {
  if (value === "all") return "all";
  return Number(value) as PageSize;
}

function rowSelectionKey(value: CellValue) {
  return JSON.stringify(value);
}

type Translate = ReturnType<typeof useI18n>["t"];

function getDeleteTitle(target: DeleteTarget | null, t: Translate) {
  if (target?.type === "clear") return t("data.clearTableTitle");
  if (target?.type === "selected") return t("data.deleteSelectedTitle");
  return t("data.deleteRowTitle");
}

function getDeleteDescription(
  target: DeleteTarget | null,
  table: string | null,
  t: Translate
) {
  if (target?.type === "clear") {
    return t("data.clearTableConfirm", { table: table ?? "" });
  }
  if (target?.type === "selected") {
    return t("data.deleteSelectedConfirm", { count: target.pkValues.length });
  }
  return t("data.deleteRowConfirm");
}
