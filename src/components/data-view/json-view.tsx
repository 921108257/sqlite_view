import { useCallback, useEffect, useMemo, useRef, useState, type UIEvent } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDatabaseStore } from "@/stores/database-store";
import { writeTextFile } from "@/tauri/commands";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { getVirtualRowWindow } from "./table-helpers";
import { buildJsonViewLines, JSON_VIEW_ROW_LIMIT } from "./json-view-helpers";
import { save } from "@tauri-apps/plugin-dialog";

const JSON_LINE_HEIGHT = 20;
const JSON_LINE_OVERSCAN = 16;

/** Rows beyond this are omitted from the preview but can still be downloaded. */
const JSON_LINE_LIMIT = JSON_VIEW_ROW_LIMIT;

export function JsonView() {
  const queryResult = useDatabaseStore((state) => state.queryResult);
  const selectedTable = useDatabaseStore((state) => state.selectedTable);
  const { toast } = useToast();
  const { t } = useI18n();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollMetrics, setScrollMetrics] = useState({
    scrollTop: 0,
    viewportHeight: 0,
  });
  const [isDownloading, setIsDownloading] = useState(false);

  const lines = useMemo(() => {
    if (!queryResult) return [];
    return buildJsonViewLines(queryResult);
  }, [queryResult]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    setScrollMetrics({
      scrollTop: element.scrollTop,
      viewportHeight: element.clientHeight,
    });
  }, [lines.length]);

  /**
   * Export a JSON array of row objects. `total_count` reflects the whole
   * filtered table, so this is offered whenever the preview is truncated
   * instead of refusing to render.
   */
  const handleDownload = useCallback(async () => {
    if (!queryResult) return;

    const path = await save({
      defaultPath: `${selectedTable ?? "table"}.json`,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (!path) return;

    setIsDownloading(true);
    try {
      const rows = queryResult.rows.map((row) => {
        const object: Record<string, unknown> = {};
        queryResult.columns.forEach((column, index) => {
          object[column] = row[index];
        });
        return object;
      });
      await writeTextFile(path, JSON.stringify(rows, null, 2));
      toast({ title: t("common.success"), description: t("data.exported", { count: rows.length }) });
    } catch (e) {
      toast({
        title: t("data.exportFailed"),
        description: String(e),
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  }, [queryResult, selectedTable, t, toast]);

  if (!queryResult) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">{t("data.loading")}</p>
      </div>
    );
  }

  const virtualWindow = getVirtualRowWindow({
    rowCount: lines.length,
    scrollTop: scrollMetrics.scrollTop,
    viewportHeight: scrollMetrics.viewportHeight || JSON_LINE_HEIGHT * 30,
    rowHeight: JSON_LINE_HEIGHT,
    overscan: JSON_LINE_OVERSCAN,
  });
  const visibleLines = lines.slice(virtualWindow.start, virtualWindow.end);
  const capped = queryResult.rows.length > JSON_LINE_LIMIT;

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    setScrollMetrics({
      scrollTop: element.scrollTop,
      viewportHeight: element.clientHeight,
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {capped && (
        <div className="flex items-center justify-between gap-2 border-b bg-muted/20 px-4 py-1.5">
          <span className="font-mono text-xs text-muted-foreground">
            {t("view.jsonLimited", { count: JSON_LINE_LIMIT })}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            onClick={() => void handleDownload()}
            disabled={isDownloading}
            aria-busy={isDownloading}
          >
            <Download aria-hidden="true" className="mr-1 h-3.5 w-3.5" />
            {t("view.downloadJson")}
          </Button>
        </div>
      )}
      <div
        ref={scrollRef}
        className="sqlite-table-scroll flex-1 overflow-auto"
        onScroll={handleScroll}
      >
        <pre className="p-4 font-mono text-xs leading-5">
          {virtualWindow.topPadding > 0 && (
            <span
              aria-hidden="true"
              className="block"
              style={{ height: virtualWindow.topPadding }}
            />
          )}
          {visibleLines.map((line, index) => (
            <span
              key={virtualWindow.start + index}
              className="block whitespace-pre"
              style={{ height: JSON_LINE_HEIGHT }}
            >
              {line}
            </span>
          ))}
          {virtualWindow.bottomPadding > 0 && (
            <span
              aria-hidden="true"
              className="block"
              style={{ height: virtualWindow.bottomPadding }}
            />
          )}
        </pre>
      </div>
    </div>
  );
}
