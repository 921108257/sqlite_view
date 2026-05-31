import { Database, FolderOpen, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDatabaseStore } from "@/stores/database-store";
import { open } from "@tauri-apps/plugin-dialog";

export function Header() {
  const { isConnected, databasePath, openDatabase, closeDatabase } = useDatabaseStore();

  const handleOpenFile = async () => {
    const selected = await open({
      multiple: false,
      filters: [
        { name: "SQLite Database", extensions: ["db", "sqlite", "sqlite3", "db3"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });
    if (selected) {
      await openDatabase(selected);
    }
  };

  const fileName = databasePath?.split(/[/\\]/).pop() ?? "";

  return (
    <header className="h-14 border-b bg-background flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <Database className="h-6 w-6 text-primary" />
        <h1 className="text-lg font-semibold">SQLite View</h1>
        {isConnected && (
          <span className="text-sm text-muted-foreground ml-2">
            — {fileName}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleOpenFile}>
          <FolderOpen className="h-4 w-4 mr-2" />
          Open Database
        </Button>
        {isConnected && (
          <Button variant="ghost" size="sm" onClick={closeDatabase}>
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        )}
      </div>
    </header>
  );
}
