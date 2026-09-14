import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { createNewTable } from "@/tauri/commands";
import { useDatabaseStore } from "@/stores/database-store";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import type { CreateColumnDef } from "@/types/database";

interface CreateTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DATA_TYPES = ["INTEGER", "TEXT", "REAL", "BLOB"] as const;

const defaultColumn: CreateColumnDef = {
  name: "",
  data_type: "TEXT",
  notnull: false,
  default_value: null,
  pk: false,
};

function emptyColumns(): CreateColumnDef[] {
  return [{ ...defaultColumn, name: "id", data_type: "INTEGER", pk: true }];
}

export function CreateTableDialog({ open, onOpenChange }: CreateTableDialogProps) {
  const [tableName, setTableName] = useState("");
  const [columns, setColumns] = useState<CreateColumnDef[]>(emptyColumns());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refreshTables } = useDatabaseStore();
  const { toast } = useToast();
  const { t } = useI18n();

  const addColumn = () => {
    setColumns([...columns, { ...defaultColumn }]);
  };

  const removeColumn = (index: number) => {
    setColumns(columns.filter((_, i) => i !== index));
  };

  const updateColumn = (
    index: number,
    field: keyof CreateColumnDef,
    value: unknown
  ) => {
    const updated = [...columns];
    updated[index] = { ...updated[index], [field]: value };
    setColumns(updated);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!tableName.trim()) {
      setError(t("createTable.nameRequired"));
      return;
    }
    if (columns.length === 0) {
      setError(t("createTable.oneColumnRequired"));
      return;
    }
    const unnamedIndex = columns.findIndex((column) => !column.name.trim());
    if (unnamedIndex >= 0) {
      setError(t("createTable.allColumnsNamed"));
      // Move focus to the offending field rather than only reporting it.
      document
        .getElementById(`create-table-column-name-${unnamedIndex}`)
        ?.focus();
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await createNewTable(tableName, columns);
      await refreshTables();
      toast({
        title: t("common.success"),
        description: t("createTable.created", { table: tableName }),
      });
      onOpenChange(false);
      setTableName("");
      setColumns(emptyColumns());
    } catch (e) {
      setError(String(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        {/* A real <form> so Enter in the name field submits (previously it did
            nothing, and the only exit was the button). */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{t("createTable.title")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="create-table-name">
              {t("createTable.tableName")}
            </label>
            <Input
              id="create-table-name"
              name="table-name"
              autoComplete="off"
              spellCheck={false}
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder={t("createTable.tableNamePlaceholder")}
              className="mt-1"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span id="create-table-columns-label" className="text-sm font-medium">
                {t("createTable.columns")}
              </span>
              <Button variant="outline" size="sm" type="button" onClick={addColumn}>
                <Plus aria-hidden="true" className="mr-1 h-4 w-4" />
                {t("createTable.addColumn")}
              </Button>
            </div>
            <div
              role="group"
              aria-labelledby="create-table-columns-label"
              className="max-h-64 space-y-2 overflow-y-auto"
            >
              {columns.map((col, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-md border p-2"
                >
                  <label
                    className="sr-only"
                    htmlFor={`create-table-column-name-${index}`}
                  >
                    {t("createTable.columnNameLabel", { index: index + 1 })}
                  </label>
                  <Input
                    id={`create-table-column-name-${index}`}
                    name={`column-name-${index}`}
                    autoComplete="off"
                    spellCheck={false}
                    value={col.name}
                    onChange={(e) => updateColumn(index, "name", e.target.value)}
                    placeholder={t("createTable.columnNamePlaceholder")}
                    className="flex-1"
                  />
                  <label
                    className="sr-only"
                    htmlFor={`create-table-column-type-${index}`}
                  >
                    {t("createTable.columnTypeLabel", { index: index + 1 })}
                  </label>
                  <select
                    id={`create-table-column-type-${index}`}
                    name={`column-type-${index}`}
                    value={col.data_type}
                    onChange={(e) =>
                      updateColumn(index, "data_type", e.target.value)
                    }
                    className="h-10 rounded-md border border-input bg-background px-3 text-foreground"
                  >
                    {DATA_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  {/* Wrapping label keeps the whole text+box as one hit target. */}
                  <label className="flex min-h-6 cursor-pointer items-center gap-1 px-1 text-sm">
                    <input
                      type="checkbox"
                      name={`column-pk-${index}`}
                      checked={col.pk}
                      onChange={(e) => updateColumn(index, "pk", e.target.checked)}
                      className="h-4 w-4 accent-primary"
                    />
                    {t("createTable.primaryKey")}
                  </label>
                  <label className="flex min-h-6 cursor-pointer items-center gap-1 px-1 text-sm">
                    <input
                      type="checkbox"
                      name={`column-notnull-${index}`}
                      checked={col.notnull}
                      onChange={(e) =>
                        updateColumn(index, "notnull", e.target.checked)
                      }
                      className="h-4 w-4 accent-primary"
                    />
                    {t("createTable.notNull")}
                  </label>
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    className="h-8 w-8 shrink-0"
                    onClick={() => removeColumn(index)}
                    disabled={columns.length === 1}
                    aria-label={t("createTable.removeColumn", { index: index + 1 })}
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            {error && (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {error}
              </p>
            )}
          </div>

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
              {t("createTable.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
