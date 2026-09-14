import type { KeyboardEvent, MouseEvent } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Funnel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDatabaseStore } from "@/stores/database-store";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

/** Width change applied per arrow-key press on the resize handle. */
const RESIZE_STEP = 16;

interface ColumnHeaderProps {
  column: string;
  filtered: boolean;
  onFilterClick: (event: MouseEvent<HTMLButtonElement>) => void;
  onResizeStart: (event: MouseEvent<HTMLButtonElement>) => void;
  /** Keyboard resize, so the handle is not pointer-only. */
  onResizeBy: (delta: number) => void;
  columnIndex: number;
}

export function ColumnHeader({
  column,
  filtered,
  onFilterClick,
  onResizeStart,
  onResizeBy,
  columnIndex,
}: ColumnHeaderProps) {
  const { orderBy, orderDir, setOrderBy } = useDatabaseStore();
  const { t } = useI18n();
  const isActive = orderBy === column;

  const handleResizeKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const step = event.shiftKey ? RESIZE_STEP * 4 : RESIZE_STEP;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      onResizeBy(step);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      onResizeBy(-step);
    }
  };

  return (
    <div className="relative flex h-9 w-full min-w-0 items-center gap-1 pr-2">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 min-w-0 flex-1 justify-start rounded-sm px-2 font-mono text-xs"
        onClick={() => setOrderBy(column)}
        title={column}
        aria-label={t("data.sortByColumn", { column })}
      >
        <span className="min-w-0 truncate" translate="no">
          {column}
        </span>
        {isActive ? (
          orderDir === "ASC" ? (
            <ArrowUp aria-hidden="true" className="ml-2 h-3.5 w-3.5 shrink-0" />
          ) : (
            <ArrowDown aria-hidden="true" className="ml-2 h-3.5 w-3.5 shrink-0" />
          )
        ) : (
          <ArrowUpDown
            aria-hidden="true"
            className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50"
          />
        )}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-7 w-7 shrink-0 rounded-sm",
          filtered && "bg-primary/10 text-primary hover:bg-primary/15"
        )}
        onClick={onFilterClick}
        aria-label={t("data.filterColumn", { column })}
      >
        <Funnel aria-hidden="true" className="h-3.5 w-3.5" />
      </Button>
      <button
        type="button"
        aria-label={t("data.resizeColumn", { column })}
        aria-describedby={`column-resize-hint-${columnIndex}`}
        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize rounded-sm bg-transparent hover:bg-primary/50 focus-visible:bg-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onMouseDown={onResizeStart}
        onKeyDown={handleResizeKeyDown}
      />
      <span id={`column-resize-hint-${columnIndex}`} className="sr-only">
        {t("data.resizeColumnHint")}
      </span>
    </div>
  );
}
