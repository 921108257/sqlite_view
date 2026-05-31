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
import { Textarea } from "@/components/ui/textarea";
import { insertTableRow } from "@/tauri/commands";
import { useDatabaseStore } from "@/stores/database-store";
import { useToast } from "@/hooks/use-toast";
import type { RowData } from "@/types/database";

interface AddRowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddRowDialog({ open, onOpenChange }: AddRowDialogProps) {
  const { selectedTable, tableColumns, refreshData } = useDatabaseStore();
  const [formData, setFormData] = useState<RowData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      const initial: RowData = {};
      tableColumns.forEach((col) => {
        if (!col.pk) {
          initial[col.name] = col.default_value ?? "";
        }
      });
      setFormData(initial);
    }
  }, [open, tableColumns]);
  const handleSubmit = async () => {
    if (!selectedTable) return;

    setIsSubmitting(true);
    try {
      const data: RowData = {};
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== "" && value !== null) {
          data[key] = value;
        }
      });

      await insertTableRow(selectedTable, data);
      await refreshData();
      toast({ title: "Success", description: "Row added successfully" });
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Error", description: String(e), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const nonPkColumns = tableColumns.filter((col) => !col.pk);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Row</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {nonPkColumns.map((col) => (
            <div key={col.name}>
              <label className="text-sm font-medium">
                {col.name}
                <span className="text-muted-foreground ml-1">({col.data_type})</span>
                {col.notnull && <span className="text-destructive ml-1">*</span>}
              </label>
              {col.data_type === "TEXT" ? (
                <Textarea
                  value={String(formData[col.name] ?? "")}
                  onChange={(e) => setFormData({ ...formData, [col.name]: e.target.value })}
                  className="mt-1"
                  rows={2}
                />
              ) : (
                <Input
                  type={col.data_type === "INTEGER" || col.data_type === "REAL" ? "number" : "text"}
                  value={String(formData[col.name] ?? "")}
                  onChange={(e) => {
                    const val = col.data_type === "INTEGER"
                      ? (e.target.value ? parseInt(e.target.value) : "")
                      : col.data_type === "REAL"
                      ? (e.target.value ? parseFloat(e.target.value) : "")
                      : e.target.value;
                    setFormData({ ...formData, [col.name]: val });
                  }}
                  className="mt-1"
                />
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add Row"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
