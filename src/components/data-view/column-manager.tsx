import { useState } from "react";
import { Columns3, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddColumnDialog } from "@/components/dialogs/add-column-dialog";
import { DeleteConfirmDialog } from "@/components/dialogs/delete-confirm-dialog";
import { useDatabaseStore } from "@/stores/database-store";
import { dropTableColumn } from "@/tauri/commands";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";

/**
 * Column management for the selected table. `add_table_column` and
 * `drop_table_column` were already implemented and registered in Rust but had
 * no UI, so the IPC surface was unreachable.
 */
export function ColumnManager() {
  const { selectedTable, tableColumns, refreshColumns } = useDatabaseStore();
  const { toast } = useToast();
  const { t } = useI18n();

  const [addOpen, setAddOpen] = useState(false);
  const [columnToDrop, setColumnToDrop] = useState<string | null>(null);
  const [isDropping, setIsDropping] = useState(false);

  const droppableColumns = tableColumns.filter((column) => !column.pk);

  const confirmDrop = async () => {
    if (!selectedTable || !columnToDrop) return;

    setIsDropping(true);
    try {
      await dropTableColumn(selectedTable, columnToDrop);
      await refreshColumns();
      toast({
        title: t("common.success"),
        description: t("data.columnDropped", { column: columnToDrop }),
      });
      setColumnToDrop(null);
    } catch (e) {
      toast({
        title: t("common.error"),
        description: String(e),
        variant: "destructive",
      });
    } finally {
      setIsDropping(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            <Columns3 aria-hidden="true" className="mr-1 h-3.5 w-3.5" />
            {t("data.manageColumns")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => setAddOpen(true)}>
            <Plus aria-hidden="true" className="mr-2 h-4 w-4" />
            {t("data.addColumn")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>{t("data.dropColumn")}</DropdownMenuLabel>
          {droppableColumns.length === 0 ? (
            <DropdownMenuItem disabled>
              {t("data.dropColumnNoneAvailable")}
            </DropdownMenuItem>
          ) : (
            droppableColumns.map((column) => (
              <DropdownMenuItem
                key={column.name}
                className="text-destructive focus:text-destructive"
                onClick={() => setColumnToDrop(column.name)}
              >
                <Trash2 aria-hidden="true" className="mr-2 h-4 w-4" />
                <span className="truncate" translate="no">
                  {column.name}
                </span>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AddColumnDialog open={addOpen} onOpenChange={setAddOpen} />

      <DeleteConfirmDialog
        open={columnToDrop !== null}
        onOpenChange={(open) => {
          if (!open) setColumnToDrop(null);
        }}
        title={t("data.dropColumnTitle")}
        description={t("data.dropColumnConfirm", {
          column: columnToDrop ?? "",
          table: selectedTable ?? "",
        })}
        onConfirm={confirmDrop}
        isLoading={isDropping}
      />
    </>
  );
}
