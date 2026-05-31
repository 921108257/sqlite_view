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
        <span className="text-sm font-medium">
          {t("sidebar.tables", { count: tables.length })}
        </span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCreateTable}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {tables.map((table) => (
            <div
              key={table.name}
              className={cn(
                "flex items-center justify-between rounded-md px-2 py-1.5 text-sm cursor-pointer group",
                selectedTable === table.name
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
              onClick={() => selectTable(table.name)}
            >
              <div className="flex items-center gap-2 truncate">
                <Table2 className="h-4 w-4 shrink-0" />
                <span className="truncate">{table.name}</span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-6 w-6 opacity-0 group-hover:opacity-100",
                      selectedTable === table.name && "opacity-100"
                    )}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onRenameTable(table.name)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    {t("sidebar.rename")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onDeleteTable(table.name)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t("sidebar.delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
}
