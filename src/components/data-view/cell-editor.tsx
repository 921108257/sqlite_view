import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";

interface CellEditorProps {
  value: unknown;
  onSave: (value: unknown) => void;
  onCancel: () => void;
  dataType: string;
}

export function CellEditor({ value, onSave, onCancel, dataType }: CellEditorProps) {
  const [editValue, setEditValue] = useState(value === null ? "" : String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  const handleSave = () => {
    let finalValue: unknown = editValue;
    if (editValue === "" || editValue === "NULL") {
      finalValue = null;
    } else if (dataType === "INTEGER") {
      finalValue = parseInt(editValue);
      if (isNaN(finalValue as number)) finalValue = editValue;
    } else if (dataType === "REAL") {
      finalValue = parseFloat(editValue);
      if (isNaN(finalValue as number)) finalValue = editValue;
    }
    onSave(finalValue);
  };

  return (
    <Input
      ref={inputRef}
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleSave}
      className="h-8 w-full min-w-[100px]"
    />
  );
}
