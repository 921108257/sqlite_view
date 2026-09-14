import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";

interface CellEditorProps {
  value: unknown;
  onSave: (value: unknown) => void;
  onCancel: () => void;
  dataType: string;
  /** Included in the accessible name so the field is not just "Edit cell". */
  columnName?: string;
}

export function CellEditor({
  value,
  onSave,
  onCancel,
  dataType,
  columnName,
}: CellEditorProps) {
  const { t } = useI18n();
  const [editValue, setEditValue] = useState(value === null ? "" : String(value));
  const inputRef = useRef<HTMLInputElement>(null);
  // Escape must not be followed by a committing blur; guard so the editor
  // resolves exactly once.
  const settledRef = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const commit = (nextValue: unknown) => {
    if (settledRef.current) return;
    settledRef.current = true;
    onSave(nextValue);
  };

  const cancel = () => {
    if (settledRef.current) return;
    settledRef.current = true;
    onCancel();
  };

  const handleSave = () => {
    commit(normalizeValue(editValue, dataType));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
  };

  return (
    <Input
      ref={inputRef}
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleSave}
      spellCheck={false}
      autoComplete="off"
      name="cell-value"
      aria-label={columnName ? `${columnName} — ${t("data.editCell")}` : t("data.editCell")}
      className="h-8 w-full min-w-[100px] font-mono text-xs"
    />
  );
}

export function normalizeValue(raw: string, dataType: string): unknown {
  if (raw === "" || raw === "NULL") return null;
  if (dataType === "INTEGER") {
    const parsed = parseInt(raw, 10);
    return Number.isNaN(parsed) ? raw : parsed;
  }
  if (dataType === "REAL") {
    const parsed = parseFloat(raw);
    return Number.isNaN(parsed) ? raw : parsed;
  }
  return raw;
}
