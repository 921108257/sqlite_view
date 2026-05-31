import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { MainContent } from "@/components/layout/main-content";
import { DataTable } from "@/components/data-view/data-table";
import { JsonView } from "@/components/data-view/json-view";
import { ViewToggle } from "@/components/data-view/view-toggle";
import { DropZone } from "@/components/drop-zone";
import { CreateTableDialog } from "@/components/dialogs/create-table-dialog";
import { DeleteConfirmDialog } from "@/components/dialogs/delete-confirm-dialog";
import { AddRowDialog } from "@/components/dialogs/add-row-dialog";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { useDatabaseStore } from "@/stores/database-store";
import { deleteTable, renameExistingTable } from "@/tauri/commands";
import { useToast } from "@/hooks/use-toast";
import { useCliArgs } from "@/hooks/use-cli-args";
import { useI18n } from "@/lib/i18n";
import { applyThemeClass, useSettingsStore } from "@/stores/settings-store";

function App() {
  useCliArgs();

  const { t } = useI18n();
  const resolvedTheme = useSettingsStore((state) => state.resolvedTheme);
  const themePreference = useSettingsStore((state) => state.themePreference);
  const refreshResolvedSettings = useSettingsStore(
    (state) => state.refreshResolvedSettings
  );
  const [viewMode, setViewMode] = useState<"table" | "json">("table");
  const [createTableOpen, setCreateTableOpen] = useState(false);
  const [addRowOpen, setAddRowOpen] = useState(false);
  const [deleteTableOpen, setDeleteTableOpen] = useState(false);
  const [tableToDelete, setTableToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { selectedTable, refreshTables, refreshData, selectTable } =
    useDatabaseStore();
  const { toast } = useToast();

  useEffect(() => {
    applyThemeClass(resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }

    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => refreshResolvedSettings();

    if (themePreference === "system") {
      query.addEventListener("change", handleChange);
      return () => query.removeEventListener("change", handleChange);
    }
  }, [refreshResolvedSettings, themePreference]);

  const handleCreateTable = () => {
    setCreateTableOpen(true);
  };

  const handleRenameTable = async (name: string) => {
    const newName = prompt(t("app.renameTablePrompt"), name);
    if (newName && newName !== name) {
      try {
        await renameExistingTable(name, newName);
        await refreshTables();
        if (selectedTable === name) {
          selectTable(newName);
        }
        toast({
          title: t("common.success"),
          description: t("app.tableRenamed", { table: newName }),
        });
      } catch (e) {
        toast({
          title: t("common.error"),
          description: String(e),
          variant: "destructive",
        });
      }
    }
  };

  const handleDeleteTable = (name: string) => {
    setTableToDelete(name);
    setDeleteTableOpen(true);
  };

  const confirmDeleteTable = async () => {
    if (!tableToDelete) return;
    setIsDeleting(true);
    try {
      await deleteTable(tableToDelete);
      await refreshTables();
      if (selectedTable === tableToDelete) {
        selectTable(null);
      }
      toast({
        title: t("common.success"),
        description: t("app.tableDeleted", { table: tableToDelete }),
      });
      setDeleteTableOpen(false);
      setTableToDelete(null);
    } catch (e) {
      toast({
        title: t("common.error"),
        description: String(e),
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DropZone>
      <div className="h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex overflow-hidden">
          <Sidebar
            onCreateTable={handleCreateTable}
            onRenameTable={handleRenameTable}
            onDeleteTable={handleDeleteTable}
          />
          <MainContent>
            <div className="border-b p-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="font-medium">{selectedTable}</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={refreshData}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAddRowOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t("app.addRow")}
                </Button>
                <ViewToggle value={viewMode} onChange={setViewMode} />
              </div>
            </div>
            {viewMode === "table" ? <DataTable /> : <JsonView />}
          </MainContent>
        </div>
      </div>

      <CreateTableDialog
        open={createTableOpen}
        onOpenChange={setCreateTableOpen}
      />
      <AddRowDialog open={addRowOpen} onOpenChange={setAddRowOpen} />
      <DeleteConfirmDialog
        open={deleteTableOpen}
        onOpenChange={setDeleteTableOpen}
        title={t("app.deleteTableTitle")}
        description={t("app.deleteTableDescription", {
          table: tableToDelete ?? "",
        })}
        onConfirm={confirmDeleteTable}
        isLoading={isDeleting}
      />
      <Toaster />
    </DropZone>
  );
}

export default App;
