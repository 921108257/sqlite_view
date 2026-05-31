import { useEffect, useMemo, useRef, useState, type UIEvent } from "react";
import { useDatabaseStore } from "@/stores/database-store";
import { useI18n } from "@/lib/i18n";
import { getVirtualRowWindow } from "./table-helpers";
import { buildJsonViewLines, JSON_VIEW_ROW_LIMIT } from "./json-view-helpers";

const JSON_LINE_HEIGHT = 20;
const JSON_LINE_OVERSCAN = 16;

export function JsonView() {
  const { queryResult } = useDatabaseStore();
  const { t } = useI18n();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollMetrics, setScrollMetrics] = useState({
    scrollTop: 0,
    viewportHeight: 0,
  });

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
  const capped = queryResult.rows.length > JSON_VIEW_ROW_LIMIT;

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
        <div className="border-b bg-muted/20 px-4 py-1.5 font-mono text-xs text-muted-foreground">
          {t("view.jsonLimited", { count: JSON_VIEW_ROW_LIMIT })}
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
