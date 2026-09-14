import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDatabaseStore } from "@/stores/database-store";
import { getTableColumnValues } from "@/tauri/commands";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  FILTER_PANEL_WIDTH,
  formatCellValue,
  type FilterPanelSide,
} from "./table-helpers";
import type { CellValue } from "@/types/database";

interface ColumnFilterPopoverProps {
  column: string;
  anchor: {
    left: number;
    right: number;
    top: number;
    bottom: number;
    side: FilterPanelSide;
  };
  onClose: () => void;
}

export function ColumnFilterPopover({
  column,
  anchor,
  onClose,
}: ColumnFilterPopoverProps) {
  const {
    selectedTable,
    filters,
    setColumnFilter,
    clearColumnFilter,
  } = useDatabaseStore();
  const { toast } = useToast();
  const { t } = useI18n();
  const panelRef = useRef<HTMLDivElement>(null);
  const currentFilter = filters.find((filter) => filter.column === column);
  const [search, setSearch] = useState(currentFilter?.search ?? "");
  const [selectedKeys, setSelectedKeys] = useState(
    () => new Set((currentFilter?.values ?? []).map(valueKey))
  );
  const [values, setValues] = useState<CellValue[]>(currentFilter?.values ?? []);
  const [truncated, setTruncated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Remember the trigger so focus can be returned on close (APG dialog pattern).
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusables = () =>
      Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'input, button, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
        ) ?? []
      ).filter((element) => !element.hasAttribute("disabled"));

    const handlePointerDown = (event: MouseEvent) => {
      if (panelRef.current?.contains(event.target as Node)) return;
      onClose();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      // Wrap focus inside the panel rather than letting Tab reach the grid.
      if (!panelRef.current?.contains(active)) {
        event.preventDefault();
        first.focus();
        return;
      }
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    focusables()[0]?.focus();

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  useEffect(() => {
    if (!selectedTable) return;

    let active = true;
    const otherFilters = filters.filter((filter) => filter.column !== column);
    setIsLoading(true);

    getTableColumnValues(
      selectedTable,
      column,
      otherFilters.length ? otherFilters : undefined
    )
      .then((result) => {
        if (!active) return;
        setValues(mergeValues(result.values, currentFilter?.values ?? []));
        setTruncated(result.truncated);
      })
      .catch((error) => {
        if (!active) return;
        toast({
          title: t("data.filterValuesFailed"),
          description: String(error),
          variant: "destructive",
        });
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [column, currentFilter?.values, filters, selectedTable, toast, t]);

  const valueMap = useMemo(() => {
    const map = new Map<string, CellValue>();
    values.forEach((value) => map.set(valueKey(value), value));
    return map;
  }, [values]);

  const visibleValues = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return values;
    return values.filter((value) =>
      formatCellValue(value).toLowerCase().includes(needle)
    );
  }, [search, values]);

  const left =
    anchor.side === "right"
      ? anchor.right + 6
      : Math.max(8, anchor.left - FILTER_PANEL_WIDTH - 6);
  const top = getPanelTop(anchor.top);

  const toggleValue = (value: CellValue) => {
    const key = valueKey(value);
    setSelectedKeys((previous) => {
      const next = new Set(previous);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const applyFilter = () => {
    const selectedValues = Array.from(selectedKeys)
      .map((key) => valueMap.get(key))
      .filter((value): value is CellValue => value !== undefined);

    setColumnFilter({
      column,
      search: search.trim() || undefined,
      values: selectedValues.length ? selectedValues : undefined,
    });
    onClose();
  };

  const clearFilter = () => {
    setSearch("");
    setSelectedKeys(new Set());
    clearColumnFilter(column);
    onClose();
  };

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={t("data.filterColumn", { column })}
      className="fixed z-50 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-xl"
      style={{ left, top, width: FILTER_PANEL_WIDTH }}
    >
      <div className="border-b bg-muted/30 p-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("data.likeSearch")}
              aria-label={t("data.filterColumn", { column })}
              spellCheck={false}
              autoComplete="off"
              name={`filter-${column}`}
              className="h-8 rounded-sm border-0 bg-background pl-7 pr-2 font-mono text-xs shadow-none ring-1 ring-border/80 focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-0"
            />
          </div>
          <Button size="sm" className="h-8 rounded-sm px-2" onClick={applyFilter}
            aria-label={t("data.applyFilter")}>
            <Check aria-hidden="true" className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-sm"
            onClick={clearFilter}
            aria-label={t("data.clearFilter")}
          >
            <X aria-hidden="true" className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {truncated && !isLoading && (
        <p className="border-b bg-muted/20 px-2 py-1 text-[11px] text-muted-foreground">
          {t("data.filterValuesTruncated")}
        </p>
      )}

      <ScrollArea className="h-64">
        <div className="p-1">
          {isLoading ? (
            <div className="flex h-20 items-center justify-center text-xs text-muted-foreground">
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              {t("data.loadingFilterValues")}
            </div>
          ) : (
            visibleValues.map((value) => {
              const key = valueKey(value);
              const checked = selectedKeys.has(key);

              return (
                <label
                  key={key}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent",
                    checked && "bg-accent/70"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleValue(value)}
                    className="h-3.5 w-3.5 accent-primary"
                  />
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate font-mono",
                      value === null && "italic text-muted-foreground"
                    )}
                    title={formatCellValue(value)}
                  >
                    {formatCellValue(value)}
                  </span>
                </label>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function valueKey(value: CellValue) {
  return JSON.stringify(value);
}

function mergeValues(primary: CellValue[], secondary: CellValue[]) {
  const result: CellValue[] = [];
  const seen = new Set<string>();

  for (const value of [...primary, ...secondary]) {
    const key = valueKey(value);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }

  return result;
}

function getPanelTop(anchorTop: number) {
  if (typeof window === "undefined") return anchorTop;
  return Math.max(8, Math.min(anchorTop, window.innerHeight - 340));
}
