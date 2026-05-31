import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDatabaseStore } from "@/stores/database-store";

export function JsonView() {
  const { queryResult } = useDatabaseStore();

  const jsonData = useMemo(() => {
    if (!queryResult) return [];
    return queryResult.rows.map((row) => {
      const obj: Record<string, unknown> = {};
      queryResult.columns.forEach((col, index) => {
        obj[col] = row[index];
      });
      return obj;
    });
  }, [queryResult]);

  if (!queryResult) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <pre className="p-4 text-sm font-mono">
        {JSON.stringify(jsonData, null, 2)}
      </pre>
    </ScrollArea>
  );
}
