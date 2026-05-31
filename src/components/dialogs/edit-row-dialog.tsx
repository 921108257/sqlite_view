import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useDatabaseStore } from "@/stores/database-store";
import { updateTableRow } from "@/tauri/commands";
import type { CellValue, ColumnInfo, RowData } from "@/types/database";

interface EditRowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rowData: RowData | null;
  pkColumnName: string | null;
  pkValue: CellValue | null;
}

export function EditRowDialog({
  open,
  onOpenChange,
  rowData,
  pkColumnName,
  pkValue,
}: EditRowDialogProps) {
  const { selectedTable, tableColumns, refreshData } = useDatabaseStore();
  const [formData, setFormData] = useState<RowData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { t } = useI18n();

  useEffect(() => {
    if (!open || !rowData) return;

    const initial: RowData = {};
    tableColumns.forEach((col) => {
      if (!col.pk) {
        initial[col.name] = rowData[col.name] ?? "";
      }
    });
    setFormData(initial);
  }, [open, rowData, tableColumns]);

  const handleSubmit = async () => {
    if (!selectedTable || !pkColumnName) return;

    setIsSubmitting(true);
    try {
      const data: RowData = {};
      Object.entries(formData).forEach(([key, value]) => {
        data[key] = value === "" ? null : value;
      });

      await updateTableRow(selectedTable, data, pkColumnName, pkValue);
      await refreshData();
      toast({ title: t("common.success"), description: t("data.rowUpdated") });
      onOpenChange(false);
    } catch (e) {
      toast({
        title: t("common.error"),
        description: String(e),
        variant: "destructive",
      });
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

  const editableColumns = tableColumns.filter((col) => !col.pk);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[82vh] max-w-3xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b bg-muted/20 px-5 py-4">
          <DialogTitle className="text-base">{t("editRow.title")}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(82vh-128px)]">
          <div className="divide-y divide-border/70">
            {editableColumns.map((col) => {
              const value = String(formData[col.name] ?? "");
              const multiline = shouldUseMultilineEditor(col, value);

              return (
                <div
                  key={col.name}
                  className="grid gap-3 px-5 py-3 transition-colors hover:bg-muted/20 md:grid-cols-[minmax(160px,220px)_1fr]"
                >
                  <div className="min-w-0 pt-1">
                    <label
                      className="block truncate text-sm font-medium"
                      htmlFor={`edit-row-${col.name}`}
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
                      id={`edit-row-${col.name}`}
                      value={value}
                      onChange={(event) => updateValue(col, event.target.value)}
                      spellCheck={false}
                      className="min-h-[92px] resize-y rounded-sm border-0 bg-background/70 px-3 py-2 font-mono text-[13px] shadow-none ring-1 ring-border/80 focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-0"
                    />
                  ) : (
                    <Input
                      id={`edit-row-${col.name}`}
                      type="text"
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
        <DialogFooter className="border-t bg-muted/20 px-5 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? t("editRow.saving") : t("editRow.submit")}
          </Button>
        </DialogFooter>
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
