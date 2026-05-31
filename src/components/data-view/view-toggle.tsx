import { Table2, Braces } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ViewToggleProps {
  value: "table" | "json";
  onChange: (value: "table" | "json") => void;
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as "table" | "json")}>
      <TabsList className="h-8">
        <TabsTrigger value="table" className="h-7 px-3 text-xs">
          <Table2 className="h-3.5 w-3.5 mr-1.5" />
          Table
        </TabsTrigger>
        <TabsTrigger value="json" className="h-7 px-3 text-xs">
          <Braces className="h-3.5 w-3.5 mr-1.5" />
          JSON
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
