import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDatabaseStore } from "@/stores/database-store";

interface ColumnHeaderProps {
  column: string;
}

export function ColumnHeader({ column }: ColumnHeaderProps) {
  const { orderBy, orderDir, setOrderBy } = useDatabaseStore();
  const isActive = orderBy === column;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 data-[state=open]:bg-accent"
      onClick={() => setOrderBy(column)}
    >
      <span>{column}</span>
      {isActive ? (
        orderDir === "ASC" ? (
          <ArrowUp className="ml-2 h-4 w-4" />
        ) : (
          <ArrowDown className="ml-2 h-4 w-4" />
        )
      ) : (
        <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
      )}
    </Button>
  );
}
