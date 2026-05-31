import type { MouseEvent } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Funnel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDatabaseStore } from "@/stores/database-store";
import { cn } from "@/lib/utils";

interface ColumnHeaderProps {
  column: string;
  filtered: boolean;
  onFilterClick: (event: MouseEvent<HTMLButtonElement>) => void;
  onResizeStart: (event: MouseEvent<HTMLButtonElement>) => void;
}

export function ColumnHeader({
  column,
  filtered,
  onFilterClick,
  onResizeStart,
}: ColumnHeaderProps) {
  const { orderBy, orderDir, setOrderBy } = useDatabaseStore();
  const isActive = orderBy === column;

  return (
    <div className="relative flex h-9 w-full min-w-0 items-center gap-1 pr-2">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 min-w-0 flex-1 justify-start rounded-sm px-2 font-mono text-xs"
        onClick={() => setOrderBy(column)}
        title={column}
      >
        <span className="min-w-0 truncate">{column}</span>
        {isActive ? (
          orderDir === "ASC" ? (
            <ArrowUp className="ml-2 h-3.5 w-3.5 shrink-0" />
          ) : (
            <ArrowDown className="ml-2 h-3.5 w-3.5 shrink-0" />
          )
        ) : (
          <ArrowUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
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
        title={`Filter ${column}`}
      >
        <Funnel className="h-3.5 w-3.5" />
      </Button>
      <button
        type="button"
        aria-label={`Resize ${column}`}
        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize rounded-sm bg-transparent hover:bg-primary/50"
        onMouseDown={onResizeStart}
      />
    </div>
  );
}
