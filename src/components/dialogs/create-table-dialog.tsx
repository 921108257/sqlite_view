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
import { createNewTable } from "@/tauri/commands";
import { useDatabaseStore } from "@/stores/database-store";
import { useToast } from "@/hooks/use-toast";
import type { CreateColumnDef } from "@/types/database";

interface CreateTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const defaultColumn: CreateColumnDef = {
  name: "",
  data_type: "TEXT",
  notnull: false,
  default_value: null,
  pk: false,
};

export function CreateTableDialog({ open, onOpenChange }: CreateTableDialogProps) {
  const [tableName, setTableName] = useState("");
  const [columns, setColumns] = useState<CreateColumnDef[]>([
    { ...defaultColumn, name: "id", data_type: "INTEGER", pk: true },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { refreshTables } = useDatabaseStore();
  const { toast } = useToast();

  const addColumn = () => {
    setColumns([...columns, { ...defaultColumn }]);
  };

  const removeColumn = (index: number) => {
    setColumns(columns.filter((_, i) => i !== index));
  };

  const updateColumn = (index: number, field: keyof CreateColumnDef, value: unknown) => {
    const updated = [...columns];
    updated[index] = { ...updated[index], [field]: value };
    setColumns(updated);
  };
  const handleSubmit = async () => {
    if (!tableName.trim()) {
      toast({ title: "Error", description: "Table name is required", variant: "destructive" });
      return;
    }
    if (columns.length === 0) {
      toast({ title: "Error", description: "At least one column is required", variant: "destructive" });
      return;
    }
    if (columns.some((c) => !c.name.trim())) {
      toast({ title: "Error", description: "All columns must have a name", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      await createNewTable(tableName, columns);
      await refreshTables();
      toast({ title: "Success", description: `Table "${tableName}" created` });
      onOpenChange(false);
      setTableName("");
      setColumns([{ ...defaultColumn, name: "id", data_type: "INTEGER", pk: true }]);
    } catch (e) {
      toast({ title: "Error", description: String(e), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Table</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Table Name</label>
            <Input
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder="my_table"
              className="mt-1"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Columns</label>
              <Button variant="outline" size="sm" onClick={addColumn}>
                <Plus className="h-4 w-4 mr-1" />
                Add Column
              </Button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {columns.map((col, index) => (
                <div key={index} className="flex items-center gap-2 p-2 border rounded-md">
                  <Input
                    value={col.name}
                    onChange={(e) => updateColumn(index, "name", e.target.value)}
                    placeholder="column_name"
                    className="flex-1"
                  />
                  <select
                    value={col.data_type}
                    onChange={(e) => updateColumn(index, "data_type", e.target.value)}
                    className="h-10 px-3 border rounded-md bg-background"
                  >
                    <option value="INTEGER">INTEGER</option>
                    <option value="TEXT">TEXT</option>
                    <option value="REAL">REAL</option>
                    <option value="BLOB">BLOB</option>
                  </select>
                  <label className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={col.pk}
                      onChange={(e) => updateColumn(index, "pk", e.target.checked)}
                    />
                    PK
                  </label>
                  <label className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={col.notnull}
                      onChange={(e) => updateColumn(index, "notnull", e.target.checked)}
                    />
                    NOT NULL
                  </label>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeColumn(index)}
                    disabled={columns.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Table"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
