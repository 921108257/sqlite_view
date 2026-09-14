import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { insertTableRow } from "@/tauri/commands";
import { useDatabaseStore } from "@/stores/database-store";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { CellValue, ColumnInfo, RowData } from "@/types/database";

interface AddRowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddRowDialog({ open, onOpenChange }: AddRowDialogProps) {
  const { selectedTable, tableColumns, refreshData } = useDatabaseStore();
  const [formData, setFormData] = useState<RowData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useI18n();

  useEffect(() => {
    if (open) {
      const initial: RowData = {};
      tableColumns.forEach((col) => {
        if (!col.pk) {
          initial[col.name] = col.default_value ?? "";
        }
      });
      setFormData(initial);
      setError(null);
    }
  }, [open, tableColumns]);

  const handleSubmit = async () => {
    if (!selectedTable) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const data: RowData = {};
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== "" && value !== null) {
          data[key] = value;
        }
      });

      // A table whose only columns are auto-generated primary keys needs no
      // values; only guard when the form actually had editable fields.
      await insertTableRow(selectedTable, data);
      await refreshData();
      toast({ title: t("common.success"), description: t("addRow.added") });
      onOpenChange(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateValue = (col: ColumnInfo, rawValue: string) => {
    let value: CellValue | "" = rawValue;

    if (col.data_type === "INTEGER") {
      value = rawValue ? parseInt(rawValue, 10) : "";
    } else if (col.data_type === "REAL") {
      value = rawValue ? parseFloat(rawValue) : "";
    }

    setFormData({ ...formData, [col.name]: value });
  };

  const nonPkColumns = tableColumns.filter((col) => !col.pk);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[82vh] overflow-hidden p-0 gap-0">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
          className="flex max-h-[82vh] flex-col overflow-hidden"
        >
          <DialogHeader className="border-b bg-muted/20 px-5 py-4">
            <DialogTitle className="text-base">{t("addRow.title")}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(82vh-128px)]">
            <div className="divide-y divide-border/70">
              {nonPkColumns.map((col) => {
                const value = String(formData[col.name] ?? "");
                const multiline = shouldUseMultilineEditor(col, value);
                const fieldId = `add-row-${col.name}`;

                return (
                  <div
                    key={col.name}
                    className="grid gap-3 px-5 py-3 transition-colors hover:bg-muted/20 md:grid-cols-[minmax(160px,220px)_1fr]"
                  >
                    <div className="min-w-0 pt-1">
                      <label
                        className="block truncate text-sm font-medium"
                        htmlFor={fieldId}
                        title={col.name}
                      >
                        {col.name}
                      </label>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="rounded-sm border border-border/80 bg-muted/30 px-1.5 py-0.5 font-mono text-[11px] uppercase text-muted-foreground">
                          {col.data_type}
                        </span>
                        {col.notnull && (
                          <span className="rounded-sm border border-destructive/40 bg-destructive/10 px-1.5 py-0.5 font-mono text-[11px] font-medium text-destructive">
                            NOT NULL
                          </span>
                        )}
                      </div>
                    </div>

                    {multiline ? (
                      <Textarea
                        id={fieldId}
                        name={col.name}
                        value={value}
                        onChange={(event) => updateValue(col, event.target.value)}
                        onKeyDown={(event) => {
                          // ⌘/Ctrl+Enter submits from inside a textarea, where
                          // plain Enter must insert a newline.
                          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                            event.preventDefault();
                            void handleSubmit();
                          }
                        }}
                        spellCheck={false}
                        className="min-h-[92px] resize-y rounded-sm border-0 bg-background/70 px-3 py-2 font-mono text-[13px] shadow-none ring-1 ring-border/80 focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-0"
                      />
                    ) : (
                      <Input
                        id={fieldId}
                        name={col.name}
                        type="text"
                        autoComplete="off"
                        inputMode={inputModeForColumn(col)}
                        value={value}
                        onChange={(event) => updateValue(col, event.target.value)}
                        spellCheck={false}
                        className={cn(
                          "h-9 rounded-sm border-0 bg-background/70 px-3 font-mono text-[13px] shadow-none ring-1 ring-border/80 focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-0",
                          isNumericColumn(col) && "text-right tabular-nums"
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
          {error && (
            <p role="alert" className="border-t border-destructive/40 bg-destructive/10 px-5 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter className="border-t bg-muted/20 px-5 py-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
              {isSubmitting && <Spinner className="mr-2" />}
              {t("addRow.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function isNumericColumn(col: ColumnInfo) {
  return col.data_type === "INTEGER" || col.data_type === "REAL";
}

function inputModeForColumn(col: ColumnInfo) {
  if (col.data_type === "INTEGER") return "numeric";
  if (col.data_type === "REAL") return "decimal";
  return "text";
}

function shouldUseMultilineEditor(col: ColumnInfo, value: string) {
  const name = col.name.toLowerCase();
  const type = col.data_type.toUpperCase();

  return (
    type === "BLOB" ||
    name.includes("json") ||
    name.includes("sql") ||
    name.includes("payload") ||
    value.length > 120
  );
}
