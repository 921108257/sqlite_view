import { useEffect, useState } from "react";
import { Download, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDatabaseStore } from "@/stores/database-store";
import { exportTableData, type ExportFormat } from "@/tauri/commands";
import { buildTableQueryParams } from "@/stores/database-query";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { save } from "@tauri-apps/plugin-dialog";

/**
 * Global search, filter summary, and export. Search is pushed into SQL (one
 * LIKE per column, OR'd) rather than filtering the current page, so results are
 * not limited to the rows already loaded.
 */
export function DataToolbar() {
  const {
    selectedTable,
    filters,
    globalSearch,
    setGlobalSearch,
    clearFilters,
    currentPage,
    pageSize,
    orderBy,
    orderDir,
  } = useDatabaseStore();
  const { toast } = useToast();
  const { t } = useI18n();

  const [term, setTerm] = useState(globalSearch);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    setTerm(globalSearch);
  }, [globalSearch]);

  // Debounce so typing does not fire one query per keystroke.
  useEffect(() => {
    if (term === globalSearch) return;
    const handle = setTimeout(() => setGlobalSearch(term), 250);
    return () => clearTimeout(handle);
  }, [term, globalSearch, setGlobalSearch]);

  const activeFilterCount = filters.length + (globalSearch.trim() ? 1 : 0);

  const handleExport = async (format: ExportFormat) => {
    if (!selectedTable) return;

    const extension = format === "csv" ? "csv" : "json";
    const path = await save({
      defaultPath: `${selectedTable}.${extension}`,
      filters: [{ name: extension.toUpperCase(), extensions: [extension] }],
    });
    if (!path) return;

    setIsExporting(true);
    try {
      const outcome = await exportTableData(
        buildTableQueryParams({
          table: selectedTable,
          currentPage,
          pageSize,
          orderBy,
          orderDir,
          filters,
          globalSearch,
        }),
        format,
        path
      );
      toast({
        title: t("common.success"),
        description: t("data.exported", { count: outcome.rows_written }),
      });
    } catch (e) {
      toast({
        title: t("data.exportFailed"),
        description: String(e),
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (!selectedTable) return null;

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <div className="relative min-w-0 flex-1 max-w-xs">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder={t("data.searchAllColumnsPlaceholder")}
          aria-label={t("data.searchAllColumns")}
          name="global-search"
          type="search"
          autoComplete="off"
          spellCheck={false}
          className="h-8 rounded-sm pl-7 pr-7 font-mono text-xs"
        />
        {term && (
          <button
            type="button"
            aria-label={t("data.clearSearch")}
            onClick={() => {
              setTerm("");
              setGlobalSearch("");
            }}
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {activeFilterCount > 0 && (
        <div className="flex shrink-0 items-center gap-1">
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {t("data.filtersActive", { count: activeFilterCount })}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 rounded-sm px-2 text-xs"
            onClick={() => {
              setTerm("");
              clearFilters();
            }}
          >
            {t("data.clearAllFilters")}
          </Button>
        </div>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 shrink-0"
            disabled={isExporting}
            aria-busy={isExporting}
          >
            {isExporting ? (
              <Spinner className="mr-1" />
            ) : (
              <Download aria-hidden="true" className="mr-1 h-3.5 w-3.5" />
            )}
            {t("data.export")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => void handleExport("csv")}>
            {t("data.exportCsv")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void handleExport("json")}>
            {t("data.exportJson")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
