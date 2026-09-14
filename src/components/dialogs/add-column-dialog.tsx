import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { addTableColumn } from "@/tauri/commands";
import { useDatabaseStore } from "@/stores/database-store";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";

interface AddColumnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DATA_TYPES = ["TEXT", "INTEGER", "REAL", "BLOB"] as const;

export function AddColumnDialog({ open, onOpenChange }: AddColumnDialogProps) {
  const { selectedTable, refreshColumns } = useDatabaseStore();
  const { toast } = useToast();
  const { t } = useI18n();

  const [name, setName] = useState("");
  const [dataType, setDataType] = useState<string>("TEXT");
  const [defaultValue, setDefaultValue] = useState("");
  const [notnull, setNotnull] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName("");
    setDataType("TEXT");
    setDefaultValue("");
    setNotnull(false);
    setError(null);
  }, [open]);

  // SQLite rejects ADD COLUMN ... NOT NULL without a default, so surface that
  // before the round trip rather than relying on a backend error.
  const requiresDefault = notnull && defaultValue.trim() === "";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = name.trim();
    if (!trimmed) {
      setError(t("data.addColumnRequiredName"));
      return;
    }
    if (requiresDefault) {
      setError(t("data.addColumnNotNullNeedsDefault"));
      return;
    }
    if (!selectedTable) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await addTableColumn(selectedTable, {
        name: trimmed,
        data_type: dataType,
        notnull,
        default_value: defaultValue.trim() === "" ? null : defaultValue.trim(),
        pk: false,
      });
      await refreshColumns();
      toast({
        title: t("common.success"),
        description: t("data.addColumnAdded", { column: trimmed }),
      });
      onOpenChange(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{t("data.addColumnTitle")}</DialogTitle>
            <DialogDescription>
              {t("data.addColumnDescription", { table: selectedTable ?? "" })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="add-column-name">
              {t("data.addColumnName")}
            </label>
            <Input
              id="add-column-name"
              name="column-name"
              autoComplete="off"
              spellCheck={false}
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "add-column-error" : undefined}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="add-column-type">
              {t("data.addColumnType")}
            </label>
            <select
              id="add-column-type"
              name="column-type"
              value={dataType}
              onChange={(event) => setDataType(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {DATA_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="add-column-default">
              {t("data.addColumnDefault")}
            </label>
            <Input
              id="add-column-default"
              name="column-default"
              autoComplete="off"
              spellCheck={false}
              value={defaultValue}
              onChange={(event) => setDefaultValue(event.target.value)}
              className="font-mono text-sm"
            />
          </div>

          <label className="flex min-h-6 cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="column-notnull"
              checked={notnull}
              onChange={(event) => setNotnull(event.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            {t("data.addColumnNotNull")}
          </label>

          {error && (
            <p
              id="add-column-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
              {isSubmitting && <Spinner className="mr-2" />}
              {t("data.addColumnSubmit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
