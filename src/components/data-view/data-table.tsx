import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Trash2,
} from "lucide-react";
import { useDatabaseStore } from "@/stores/database-store";
import { ColumnHeader } from "./column-header";
import { CellEditor } from "./cell-editor";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { updateTableRow, deleteTableRow } from "@/tauri/commands";
import { useToast } from "@/hooks/use-toast";
import type { RowData, CellValue } from "@/types/database";

export function DataTable() {
  const {
    queryResult,
    tableColumns,
    selectedTable,
    currentPage,
    pageSize,
    setPage,
    refreshData,
    isLoading,
  } = useDatabaseStore();
  const { toast } = useToast();

  const [editingCell, setEditingCell] = useState<{
    rowIndex: number;
    colIndex: number;
  } | null>(null);

  const pkColumn = tableColumns.find((c) => c.pk);

  const handleCellDoubleClick = (rowIndex: number, colIndex: number) => {
    setEditingCell({ rowIndex, colIndex });
  };

  const handleCellSave = async (
    rowIndex: number,
    colIndex: number,
    newValue: unknown
  ) => {
    if (!selectedTable || !pkColumn || !queryResult) return;

    const row = queryResult.rows[rowIndex];
    const pkColIndex = queryResult.columns.indexOf(pkColumn.name);
    const pkValue = row[pkColIndex];
    const columnName = queryResult.columns[colIndex];

    try {
      const data: RowData = { [columnName]: newValue as CellValue };
      await updateTableRow(selectedTable, data, pkColumn.name, pkValue);
      await refreshData();
      toast({ title: "Success", description: "Cell updated" });
    } catch (e) {
      toast({ title: "Error", description: String(e), variant: "destructive" });
    }
    setEditingCell(null);
  };

  const handleDeleteRow = async (rowIndex: number) => {
    if (!selectedTable || !pkColumn || !queryResult) return;

    const row = queryResult.rows[rowIndex];
    const pkColIndex = queryResult.columns.indexOf(pkColumn.name);
    const pkValue = row[pkColIndex];

    if (!confirm("Are you sure you want to delete this row?")) return;

    try {
      await deleteTableRow(selectedTable, pkColumn.name, pkValue);
      await refreshData();
      toast({ title: "Success", description: "Row deleted" });
    } catch (e) {
      toast({ title: "Error", description: String(e), variant: "destructive" });
    }
  };

  const columns: ColumnDef<unknown[]>[] = useMemo(() => {
    if (!queryResult) return [];

    const dataCols: ColumnDef<unknown[]>[] = queryResult.columns.map((col, index) => {
      const colInfo = tableColumns.find((c) => c.name === col);
      return {
        id: col,
        accessorFn: (row: unknown[]) => row[index],
        header: () => <ColumnHeader column={col} />,
        cell: ({ row, getValue }) => {
          const value = getValue();
          const rowIndex = row.index;

          if (
            editingCell?.rowIndex === rowIndex &&
            editingCell?.colIndex === index
          ) {
            return (
              <CellEditor
                value={value}
                dataType={colInfo?.data_type ?? "TEXT"}
                onSave={(newValue) => handleCellSave(rowIndex, index, newValue)}
                onCancel={() => setEditingCell(null)}
              />
            );
          }

          return (
            <div
              className="cursor-pointer hover:bg-muted/50 px-1 -mx-1 rounded"
              onDoubleClick={() => handleCellDoubleClick(rowIndex, index)}
            >
              {value === null ? (
                <span className="text-muted-foreground italic">NULL</span>
              ) : typeof value === "boolean" ? (
                value ? "true" : "false"
              ) : (
                String(value)
              )}
            </div>
          );
        },
      };
    });

    // Add actions column
    if (pkColumn) {
      dataCols.push({
        id: "_actions",
        header: () => null,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100"
            onClick={() => handleDeleteRow(row.index)}
          >
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        ),
      });
    }

    return dataCols;
  }, [queryResult, tableColumns, editingCell, pkColumn]);

  const table = useReactTable({
    data: queryResult?.rows ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil((queryResult?.total_count ?? 0) / pageSize),
  });

  const totalPages = Math.ceil((queryResult?.total_count ?? 0) / pageSize);

  if (!queryResult) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ScrollArea className="flex-1">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="whitespace-nowrap">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="group">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No data
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Pagination */}
      <div className="border-t p-2 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {queryResult.total_count} rows total
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Page {currentPage + 1} of {totalPages || 1}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(0)}
              disabled={currentPage === 0 || isLoading}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage === 0 || isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage >= totalPages - 1 || isLoading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(totalPages - 1)}
              disabled={currentPage >= totalPages - 1 || isLoading}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
