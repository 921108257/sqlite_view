import { Table2, Plus, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDatabaseStore } from "@/stores/database-store";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

interface SidebarProps {
  onCreateTable: () => void;
  onRenameTable: (name: string) => void;
  onDeleteTable: (name: string) => void;
}

export function Sidebar({ onCreateTable, onRenameTable, onDeleteTable }: SidebarProps) {
  const { tables, selectedTable, selectTable, isConnected } = useDatabaseStore();
  const { t } = useI18n();

  if (!isConnected) {
    return (
      <aside className="w-64 border-r bg-muted/30 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">
          {t("sidebar.noDatabaseConnected")}
        </p>
      </aside>
    );
  }

  return (
    <aside className="w-64 border-r bg-muted/30 flex flex-col">
      <div className="p-3 border-b flex items-center justify-between">
        <span className="text-sm font-medium tabular-nums">
          {t("sidebar.tables", { count: tables.length })}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onCreateTable}
          aria-label={t("sidebar.createTable")}
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {tables.length === 0 && (
            <p className="px-2 py-3 text-xs text-muted-foreground">
              {t("sidebar.noTables")}
            </p>
          )}
          {tables.map((table) => {
            const isSelected = selectedTable === table.name;

            return (
              <div
                key={table.name}
                // The row is a real button (keyboard + semantics), with the
                // actions menu kept as a sibling so it is not nested inside it.
                className={cn(
                  "flex items-center justify-between rounded-md group",
                  isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                )}
              >
                <button
                  type="button"
                  aria-current={isSelected ? "true" : undefined}
                  onClick={() => selectTable(table.name)}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Table2 aria-hidden="true" className="h-4 w-4 shrink-0" />
                  <span className="truncate" translate="no">
                    {table.name}
                  </span>
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "mr-1 h-6 w-6 shrink-0 opacity-0 focus-visible:opacity-100 group-hover:opacity-100",
                        isSelected && "opacity-100"
                      )}
                      aria-label={t("sidebar.tableActions", { table: table.name })}
                    >
                      <MoreVertical aria-hidden="true" className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onRenameTable(table.name)}>
                      <Pencil aria-hidden="true" className="h-4 w-4 mr-2" />
                      {t("sidebar.rename")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => onDeleteTable(table.name)}
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4 mr-2" />
                      {t("sidebar.delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </aside>
  );
}
