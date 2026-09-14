import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type UIEvent as ReactUIEvent,
} from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Edit3,
  Eraser,
  FileCode2,
  MoreVertical,
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
  updateTableRow,
} from "@/tauri/commands";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { formatCount } from "@/lib/format";
import {
  rowToInsertStatement,
  rowToTsv,
  rowValuesAt,
  writeToClipboard,
} from "@/lib/clipboard";
import { cn } from "@/lib/utils";
import { ColumnHeader } from "./column-header";
import { ColumnFilterPopover } from "./column-filter-popover";
import { CellEditor } from "./cell-editor";
import {
  COLUMN_MIN_WIDTH,
  formatCellValue,
  getTotalPages,
  getVirtualRowWindow,
  normalizeCellValue,
  resolveFilterPanelSide,
  type FilterPanelSide,
} from "./table-helpers";
import type { CellValue, PageSize, RowData } from "@/types/database";

const SELECT_COLUMN_WIDTH = 42;
const ROW_HEIGHT = 32;
const ROW_OVERSCAN = 8;
const LOAD_MORE_THRESHOLD_PX = 1200;
const CONTEXT_MENU_WIDTH = 176;

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

/** Cell that owns the single tab stop for the grid's roving tabindex. */
interface ActiveCell {
  row: number;
  column: number;
}

export function DataTable() {
  // Narrow subscriptions: the grid no longer re-renders for unrelated state.
  const queryResult = useDatabaseStore((state) => state.queryResult);
  const tableColumns = useDatabaseStore((state) => state.tableColumns);
  const selectedTable = useDatabaseStore((state) => state.selectedTable);
  const currentPage = useDatabaseStore((state) => state.currentPage);
  const pageSize = useDatabaseStore((state) => state.pageSize);
  const orderBy = useDatabaseStore((state) => state.orderBy);
  const orderDir = useDatabaseStore((state) => state.orderDir);
  const filters = useDatabaseStore((state) => state.filters);
  const setPage = useDatabaseStore((state) => state.setPage);
  const setPageSize = useDatabaseStore((state) => state.setPageSize);
  const refreshData = useDatabaseStore((state) => state.refreshData);
  const loadMoreData = useDatabaseStore((state) => state.loadMoreData);
  const isLoading = useDatabaseStore((state) => state.isLoading);
  const isLoadingMore = useDatabaseStore((state) => state.isLoadingMore);

  const { toast } = useToast();
  const { t, language } = useI18n();

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
  const [activeCell, setActiveCell] = useState<ActiveCell>({ row: 0, column: 0 });
  const [editingCell, setEditingCell] = useState<ActiveCell | null>(null);
  const [scrollMetrics, setScrollMetrics] = useState({
    scrollTop: 0,
    viewportHeight: 0,
  });
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const pendingFocusRef = useRef<string | null>(null);
  // Coalesce scroll-driven state updates to one per animation frame.
  const scrollFrameRef = useRef<number | null>(null);

  const pkColumn = tableColumns.find((column) => column.pk);
  const pkColumnIndex =
    pkColumn && queryResult ? queryResult.columns.indexOf(pkColumn.name) : -1;
  const rows = queryResult?.rows ?? [];
  const columns = queryResult?.columns ?? [];
  const columnCount = columns.length;
  const columnsKey = columns.join("\u0000");
  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    if (!columnCount) return;

    setColumnWidths((previous) => {
      const next: Record<string, number> = {};
      columns.forEach((column) => {
        next[column] = Math.max(previous[column] ?? COLUMN_MIN_WIDTH, COLUMN_MIN_WIDTH);
      });
      return next;
    });
  }, [columnsKey, columnCount, columns]);

  // Selection intentionally survives pagination and sorting: it is keyed by
  // primary key, so the user can collect rows across pages. It resets on table
  // change, filter change (rows may no longer exist), or after a delete.
  useEffect(() => {
    setSelectedRows({});
    setActiveCell({ row: 0, column: 0 });
    setEditingCell(null);
  }, [selectedTable]);

  useEffect(() => {
    setActiveCell((previous) =>
      previous.row < rows.length ? previous : { row: 0, column: previous.column }
    );
    setEditingCell(null);
  }, [rows.length, currentPage, pageSize, orderBy, orderDir, filtersKey]);

  useEffect(() => {
    const element = scrollContainerRef.current;
    if (!element) return;

    setScrollMetrics({
      scrollTop: element.scrollTop,
      viewportHeight: element.clientHeight,
    });
  }, [rows.length, selectedTable, pageSize]);

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

  // Move focus into the menu so it is operable without a pointer.
  useEffect(() => {
    if (!contextMenu) return;
    const first = contextMenuRef.current?.querySelector<HTMLButtonElement>(
      'button:not([disabled])'
    );
    first?.focus();
  }, [contextMenu]);

  // Cancel any pending frame so a late scroll cannot set state after unmount.
  useEffect(
    () => () => {
      if (scrollFrameRef.current !== null) {
        cancelAnimationFrame(scrollFrameRef.current);
      }
    },
    []
  );

  const totalPages = getTotalPages(queryResult?.total_count ?? 0, pageSize);
  const selectedCount = Object.keys(selectedRows).length;
  const tableWidth =
    SELECT_COLUMN_WIDTH +
    columns.reduce(
      (total, column) => total + (columnWidths[column] ?? COLUMN_MIN_WIDTH),
      0
    );
  const virtualWindow = getVirtualRowWindow({
    rowCount: rows.length,
    scrollTop: scrollMetrics.scrollTop,
    viewportHeight: scrollMetrics.viewportHeight || ROW_HEIGHT * 20,
    rowHeight: ROW_HEIGHT,
    overscan: ROW_OVERSCAN,
  });
  const virtualRows = rows.slice(virtualWindow.start, virtualWindow.end);
  const tableColSpan = columnCount + 1;

  const selectionKeyAt = useCallback(
    (rowIndex: number) => {
      if (pkColumnIndex < 0) return null;
      const value = normalizeCellValue(rows[rowIndex]?.[pkColumnIndex]);
      // A NULL primary key is not a valid identifier, so fall back to the row
      // position to keep keys unique (previously every NULL row shared one key).
      return value === null ? `row:${rowIndex}` : JSON.stringify(value);
    },
    [pkColumnIndex, rows]
  );

  const visibleSelectionKeys = useMemo(
    () =>
      rows
        .map((_, rowIndex) => selectionKeyAt(rowIndex))
        .filter((key): key is string => key !== null),
    [rows, selectionKeyAt]
  );

  const allVisibleSelected =
    visibleSelectionKeys.length > 0 &&
    visibleSelectionKeys.every((key) => selectedRows[key] !== undefined);
  const hasVisibleSelection = visibleSelectionKeys.some(
    (key) => selectedRows[key] !== undefined
  );

  const getRowPkValue = useCallback(
    (rowIndex: number): CellValue | null => {
      if (!queryResult || pkColumnIndex < 0) return null;
      return normalizeCellValue(queryResult.rows[rowIndex]?.[pkColumnIndex]);
    },
    [pkColumnIndex, queryResult]
  );

  const toggleRowSelection = (rowIndex: number) => {
    if (!pkColumn) return;
    const key = selectionKeyAt(rowIndex);
    if (key === null) return;
    const pkValue = getRowPkValue(rowIndex);

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
        rows.forEach((row, rowIndex) => {
          const key = selectionKeyAt(rowIndex);
          if (key !== null) next[key] = normalizeCellValue(row[pkColumnIndex]);
        });
      }
      return next;
    });
  };

  const handleDeleteRow = (rowIndex: number) => {
    if (!pkColumn) return;
    setDeleteTarget({ type: "row", pkValue: getRowPkValue(rowIndex) });
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

  const saveCell = async (rowIndex: number, columnIndex: number, nextValue: unknown) => {
    setEditingCell(null);
    if (!selectedTable || !pkColumn || pkColumnIndex < 0) return;

    const columnName = columns[columnIndex];
    const current = normalizeCellValue(rows[rowIndex]?.[columnIndex]);
    const normalized = normalizeCellValue(nextValue);
    if (current === normalized || (current === null && normalized === null)) return;

    try {
      await updateTableRow(
        selectedTable,
        { [columnName]: normalized } as RowData,
        pkColumn.name,
        getRowPkValue(rowIndex)
      );
      await refreshData();
      toast({ title: t("common.success"), description: t("data.cellUpdated") });
    } catch (e) {
      toast({
        title: t("common.error"),
        description: String(e),
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await writeToClipboard(text);
      toast({ title: t("common.success"), description: t("data.copied") });
    } catch (e) {
      toast({
        title: t("data.copyFailed"),
        description: String(e),
        variant: "destructive",
      });
    }
  };

  const copyCell = (rowIndex: number, columnIndex: number) =>
    copyToClipboard(formatCellValue(normalizeCellValue(rows[rowIndex]?.[columnIndex])));

  const copyRow = (rowIndex: number) =>
    copyToClipboard(rowToTsv(rowValuesAt(queryResult!, rowIndex)));

  const copyRowAsInsert = (rowIndex: number) =>
    copyToClipboard(
      rowToInsertStatement(selectedTable ?? "", columns, rowValuesAt(queryResult!, rowIndex))
    );

  const openContextMenu = (event: ReactMouseEvent, rowIndex: number) => {
    event.preventDefault();
    setActiveCell((previous) => ({ row: rowIndex, column: previous.column }));
    setContextMenu({
      x: Math.min(event.clientX, window.innerWidth - CONTEXT_MENU_WIDTH),
      y: Math.min(event.clientY, window.innerHeight - 160),
      rowIndex,
    });
  };

  const openContextMenuForActiveRow = () => {
    const element = scrollContainerRef.current?.querySelector<HTMLElement>(
      `[data-row-index="${activeCell.row}"]`
    );
    const rect = element?.getBoundingClientRect();
    setContextMenu({
      x: Math.min(rect?.left ?? 80, window.innerWidth - CONTEXT_MENU_WIDTH),
      y: Math.min(rect?.bottom ?? 120, window.innerHeight - 160),
      rowIndex: activeCell.row,
    });
  };

  const handleContextMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" || event.key === "Tab") {
      setContextMenu(null);
      return;
    }

    const items = Array.from(
      contextMenuRef.current?.querySelectorAll<HTMLButtonElement>(
        'button:not([disabled])'
      ) ?? []
    );
    if (items.length === 0) return;

    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);

    if (event.key === "ArrowDown") {
      event.preventDefault();
      items[(currentIndex + 1) % items.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      items[(currentIndex - 1 + items.length) % items.length]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      items[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      items[items.length - 1]?.focus();
    }
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

  const resizeColumnBy = (column: string, delta: number) => {
    setColumnWidths((previous) => ({
      ...previous,
      [column]: Math.max(COLUMN_MIN_WIDTH, (previous[column] ?? COLUMN_MIN_WIDTH) + delta),
    }));
  };

  const handleTableScroll = (event: ReactUIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    // Reading layout in the handler and deferring the state write keeps scroll
    // off the render path and coalesces bursts into one update per frame.
    const next = {
      scrollTop: element.scrollTop,
      viewportHeight: element.clientHeight,
    };
    const remaining =
      element.scrollHeight - element.scrollTop - element.clientHeight;

    if (scrollFrameRef.current !== null) {
      cancelAnimationFrame(scrollFrameRef.current);
    }
    scrollFrameRef.current = requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      setScrollMetrics(next);
    });

    setContextMenu(null);

    if (
      pageSize === "all" &&
      remaining < LOAD_MORE_THRESHOLD_PX &&
      rows.length < (queryResult?.total_count ?? 0) &&
      !isLoadingMore
    ) {
      void loadMoreData();
    }
  };

  const findCell = (row: number, column: number) =>
    scrollContainerRef.current?.querySelector<HTMLElement>(
      `[data-cell="${row}:${column}"]`
    );

  const focusCell = (row: number, column: number) => {
    const target = findCell(row, column);
    if (target) {
      target.focus();
      return;
    }
    // Rows are virtualized, so the target may not be mounted. Record it and let
    // the effect below focus once the container has scrolled it into view.
    pendingFocusRef.current = `${row}:${column}`;
    const container = scrollContainerRef.current;
    if (container) {
      const top = row * ROW_HEIGHT;
      const bottom = top + ROW_HEIGHT;
      if (top < container.scrollTop) {
        container.scrollTop = top;
      } else if (bottom > container.scrollTop + container.clientHeight) {
        container.scrollTop = bottom - container.clientHeight;
      }
    }
  };

  // Complete a deferred focus after virtualization renders the target row.
  useEffect(() => {
    const pending = pendingFocusRef.current;
    if (!pending) return;

    const [row, column] = pending.split(":").map(Number);
    const target = findCell(row, column);
    if (target) {
      pendingFocusRef.current = null;
      target.focus();
    }
  });

  const moveActiveCell = (row: number, column: number) => {
    const nextRow = Math.min(Math.max(row, 0), Math.max(rows.length - 1, 0));
    const nextColumn = Math.min(Math.max(column, 0), Math.max(columnCount - 1, 0));
    setActiveCell({ row: nextRow, column: nextColumn });
    focusCell(nextRow, nextColumn);
  };

  const handleCellKeyDown = (
    event: ReactKeyboardEvent<HTMLDivElement>,
    rowIndex: number,
    columnIndex: number
  ) => {
    if (editingCell) return;

    switch (event.key) {
      case "Enter":
        event.preventDefault();
        if (pkColumn) {
          setActiveCell({ row: rowIndex, column: columnIndex });
          setEditingCell({ row: rowIndex, column: columnIndex });
        }
        break;
      case "ArrowUp":
        event.preventDefault();
        moveActiveCell(rowIndex - 1, columnIndex);
        break;
      case "ArrowDown":
        event.preventDefault();
        moveActiveCell(rowIndex + 1, columnIndex);
        break;
      case "ArrowLeft":
        event.preventDefault();
        moveActiveCell(rowIndex, columnIndex - 1);
        break;
      case "ArrowRight":
        event.preventDefault();
        moveActiveCell(rowIndex, columnIndex + 1);
        break;
      case "Home":
        event.preventDefault();
        moveActiveCell(rowIndex, 0);
        break;
      case "End":
        event.preventDefault();
        moveActiveCell(rowIndex, columnCount - 1);
        break;
      case "c":
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          void copyCell(rowIndex, columnIndex);
        }
        break;
      default:
        break;
    }
  };

  if (!queryResult) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">{t("data.loading")}</p>
      </div>
    );
  }

  const hasRows = rows.length > 0;

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
            <Eraser aria-hidden="true" className="mr-1.5 h-3.5 w-3.5" />
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
            <Trash2 aria-hidden="true" className="mr-1.5 h-3.5 w-3.5" />
            {t("data.deleteSelected")}
          </Button>
          {selectedCount > 0 && (
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              {formatCount(selectedCount, language)}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {hasRows && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 rounded-sm px-2 text-xs"
              onClick={openContextMenuForActiveRow}
              aria-haspopup="menu"
              aria-label={t("data.rowActions")}
            >
              <MoreVertical aria-hidden="true" className="h-3.5 w-3.5" />
            </Button>
          )}
          {!pkColumn && (
            <span className="font-mono text-[11px] text-muted-foreground">
              {t("data.noPrimaryKeyRowActionsDisabled")}
            </span>
          )}
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="sqlite-table-scroll flex-1 overflow-auto"
        onScroll={handleTableScroll}
      >
        <table
          role="grid"
          aria-rowcount={queryResult.total_count}
          aria-colcount={columnCount}
          aria-label={t("data.gridLabel", { table: selectedTable ?? "" })}
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
              <TableHead
                role="columnheader"
                className="sticky left-0 z-30 h-9 border-b border-r bg-background p-0 text-center"
              >
                <input
                  type="checkbox"
                  aria-label={t("data.selectAllRows")}
                  checked={allVisibleSelected}
                  disabled={!pkColumn || !hasRows}
                  onChange={toggleAllVisibleRows}
                  ref={(element) => {
                    // Indeterminate is a DOM property; it cannot be expressed
                    // as an attribute, so set it imperatively.
                    if (element) {
                      element.indeterminate = hasVisibleSelection && !allVisibleSelected;
                    }
                  }}
                  className="h-4 w-4 accent-primary disabled:opacity-40"
                />
              </TableHead>
              {columns.map((column, columnIndex) => (
                <TableHead
                  key={column}
                  role="columnheader"
                  aria-sort={
                    orderBy === column
                      ? orderDir === "ASC"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
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
                    onResizeBy={(delta) => resizeColumnBy(column, delta)}
                    columnIndex={columnIndex}
                  />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {virtualWindow.topPadding > 0 && (
              <tr aria-hidden="true">
                <td
                  colSpan={tableColSpan}
                  className="border-0 p-0"
                  style={{ height: virtualWindow.topPadding }}
                />
              </tr>
            )}
            {virtualRows.map((row, virtualIndex) => {
              const rowIndex = virtualWindow.start + virtualIndex;
              const key = selectionKeyAt(rowIndex);
              const selected = key !== null && selectedRows[key] !== undefined;

              return (
                <TableRow
                  key={rowIndex}
                  data-row-index={rowIndex}
                  role="row"
                  aria-rowindex={rowIndex + 2}
                  data-state={selected ? "selected" : undefined}
                  className="group hover:bg-muted/40"
                  onContextMenu={(event) => openContextMenu(event, rowIndex)}
                >
                  <TableCell
                    role="gridcell"
                    className="sticky left-0 z-10 border-b border-r bg-background p-0 text-center group-hover:bg-muted/40"
                  >
                    <input
                      type="checkbox"
                      aria-label={t("data.selectRow", { row: rowIndex + 1 })}
                      checked={selected}
                      disabled={!pkColumn}
                      onChange={() => toggleRowSelection(rowIndex)}
                      onClick={(event) => event.stopPropagation()}
                      className="h-4 w-4 accent-primary disabled:opacity-40"
                    />
                  </TableCell>
                  {columns.map((column, colIndex) => {
                    const value = normalizeCellValue(row[colIndex]);
                    const isEditing =
                      editingCell?.row === rowIndex && editingCell?.column === colIndex;
                    const isFocused =
                      activeCell.row === rowIndex && activeCell.column === colIndex;

                    return (
                      <TableCell
                        key={column}
                        role="gridcell"
                        aria-colindex={colIndex + 2}
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
                        {isEditing ? (
                          <CellEditor
                            value={value}
                            dataType={
                              tableColumns.find((item) => item.name === column)
                                ?.data_type ?? ""
                            }
                            columnName={column}
                            onSave={(next) => void saveCell(rowIndex, colIndex, next)}
                            onCancel={() => {
                              setEditingCell(null);
                              focusCell(rowIndex, colIndex);
                            }}
                          />
                        ) : (
                          <div
                            data-cell={`${rowIndex}:${colIndex}`}
                            tabIndex={isFocused ? 0 : -1}
                            aria-label={`${column}: ${formatCellValue(value)}`}
                            className={cn(
                              "min-w-0 cursor-cell truncate rounded-sm px-1 py-0.5 font-mono text-xs hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              value === null && "italic text-muted-foreground",
                              isFocused && "ring-2 ring-ring/60"
                            )}
                            title={formatCellValue(value)}
                            onFocus={() =>
                              setActiveCell({ row: rowIndex, column: colIndex })
                            }
                            onDoubleClick={() => {
                              if (!pkColumn) return;
                              setActiveCell({ row: rowIndex, column: colIndex });
                              setEditingCell({ row: rowIndex, column: colIndex });
                            }}
                            onKeyDown={(event) =>
                              handleCellKeyDown(event, rowIndex, colIndex)
                            }
                          >
                            {formatCellValue(value)}
                          </div>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
            {virtualWindow.bottomPadding > 0 && (
              <tr aria-hidden="true">
                <td
                  colSpan={tableColSpan}
                  className="border-0 p-0"
                  style={{ height: virtualWindow.bottomPadding }}
                />
              </tr>
            )}
          </TableBody>
        </table>

        {!hasRows && (
          <div
            role="status"
            className="flex flex-1 flex-col items-center justify-center gap-2 p-10 text-center"
          >
            <p className="text-base font-medium text-muted-foreground">
              {t("data.noData")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("data.noDataHint")}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t bg-muted/10 px-2 py-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground tabular-nums">
            {t("data.rowsTotal", { count: queryResult.total_count })}
          </span>
          <label htmlFor="page-size" className="sr-only">
            {t("data.pageSize")}
          </label>
          <select
            id="page-size"
            value={String(pageSize)}
            onChange={(event) => setPageSize(parsePageSize(event.target.value))}
            className="h-8 rounded-sm border border-input bg-background px-2 font-mono text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="500">500</option>
            <option value="1000">1000</option>
            <option value="all">{t("data.pageSizeAll")}</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground tabular-nums">
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
              aria-label={t("data.firstPage")}
            >
              <ChevronsLeft aria-hidden="true" className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-sm"
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage === 0 || isLoading || pageSize === "all"}
              aria-label={t("data.previousPage")}
            >
              <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-sm"
              onClick={() => setPage(currentPage + 1)}
              disabled={
                currentPage >= totalPages - 1 || isLoading || pageSize === "all"
              }
              aria-label={t("data.nextPage")}
            >
              <ChevronRight aria-hidden="true" className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-sm"
              onClick={() => setPage(totalPages - 1)}
              disabled={
                currentPage >= totalPages - 1 || isLoading || pageSize === "all"
              }
              aria-label={t("data.lastPage")}
            >
              <ChevronsRight aria-hidden="true" className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {contextMenu && (
        <div
          ref={contextMenuRef}
          role="menu"
          aria-label={t("data.rowActions")}
          className="fixed z-50 w-44 rounded-md border bg-popover p-1 text-popover-foreground shadow-lg"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={handleContextMenuKeyDown}
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
            onClick={editContextRow}
            disabled={!pkColumn}
          >
            <Edit3 aria-hidden="true" className="h-3.5 w-3.5" />
            {t("common.modify")}
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
            onClick={() => {
              void copyCell(contextMenu.rowIndex, activeCell.column);
              setContextMenu(null);
            }}
          >
            <Copy aria-hidden="true" className="h-3.5 w-3.5" />
            {t("data.copyCell")}
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
            onClick={() => {
              void copyRow(contextMenu.rowIndex);
              setContextMenu(null);
            }}
          >
            <Copy aria-hidden="true" className="h-3.5 w-3.5" />
            {t("data.copyRow")}
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
            onClick={() => {
              void copyRowAsInsert(contextMenu.rowIndex);
              setContextMenu(null);
            }}
          >
            <FileCode2 aria-hidden="true" className="h-3.5 w-3.5" />
            {t("data.copyRowAsSql")}
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10 focus-visible:bg-destructive/10 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
            onClick={deleteContextRow}
            disabled={!pkColumn}
          >
            <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
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
