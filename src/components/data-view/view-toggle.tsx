import { Table2, Braces } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18n";

interface ViewToggleProps {
  value: "table" | "json";
  onChange: (value: "table" | "json") => void;
  disableJson?: boolean;
}

export function ViewToggle({ value, onChange, disableJson }: ViewToggleProps) {
  const { t } = useI18n();

  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as "table" | "json")}>
      <TabsList className="h-8">
        <TabsTrigger value="table" className="h-7 px-3 text-xs">
          <Table2 className="h-3.5 w-3.5 mr-1.5" />
          {t("view.table")}
        </TabsTrigger>
        <TabsTrigger
          value="json"
          className="h-7 px-3 text-xs"
          disabled={disableJson}
          title={disableJson ? t("view.jsonDisabledAll") : undefined}
        >
          <Braces className="h-3.5 w-3.5 mr-1.5" />
          {t("view.json")}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
