import { useState } from "react";
import { Database, FolderOpen, Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsDialog } from "@/components/dialogs/settings-dialog";
import { useDatabaseStore } from "@/stores/database-store";
import { useI18n } from "@/lib/i18n";
import { open } from "@tauri-apps/plugin-dialog";

export function Header() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { t } = useI18n();
  const { isConnected, databasePath, openDatabase, closeDatabase } =
    useDatabaseStore();

  const handleOpenFile = async () => {
    const selected = await open({
      multiple: false,
      filters: [
        {
          name: t("header.sqliteDatabase"),
          extensions: ["db", "sqlite", "sqlite3", "db3"],
        },
        { name: t("header.allFiles"), extensions: ["*"] },
      ],
    });
    if (selected) {
      await openDatabase(selected);
    }
  };

  const fileName = databasePath?.split(/[/\\]/).pop() ?? "";

  return (
    <header className="h-14 border-b bg-background flex items-center justify-between px-4">
      <div className="flex items-center gap-3 min-w-0">
        <Database className="h-6 w-6 text-primary shrink-0" />
        <h1 className="text-lg font-semibold shrink-0">SQLite View</h1>
        {isConnected && (
          <span className="text-sm text-muted-foreground ml-2 truncate">
            - {fileName}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => setSettingsOpen(true)}
          title={t("settings.open")}
          aria-label={t("settings.open")}
        >
          <Settings className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleOpenFile}>
          <FolderOpen className="h-4 w-4 mr-2" />
          {t("header.openDatabase")}
        </Button>
        {isConnected && (
          <Button variant="ghost" size="sm" onClick={closeDatabase}>
            <X className="h-4 w-4 mr-2" />
            {t("header.closeDatabase")}
          </Button>
        )}
      </div>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </header>
  );
}
