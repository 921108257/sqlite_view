import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { MainContent } from "@/components/layout/main-content";
import { ErrorBanner } from "@/components/layout/error-banner";
import { DataTable } from "@/components/data-view/data-table";
import { JsonView } from "@/components/data-view/json-view";
import { ViewToggle } from "@/components/data-view/view-toggle";
import { DataToolbar } from "@/components/data-view/data-toolbar";
import { ColumnManager } from "@/components/data-view/column-manager";
import { DropZone } from "@/components/drop-zone";
import { CreateTableDialog } from "@/components/dialogs/create-table-dialog";
import { DeleteConfirmDialog } from "@/components/dialogs/delete-confirm-dialog";
import { RenameTableDialog } from "@/components/dialogs/rename-table-dialog";
import { AddRowDialog } from "@/components/dialogs/add-row-dialog";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { useDatabaseStore } from "@/stores/database-store";
import { deleteTable, renameExistingTable } from "@/tauri/commands";
import { useToast } from "@/hooks/use-toast";
import { useCliArgs } from "@/hooks/use-cli-args";
import { useI18n } from "@/lib/i18n";
import { applyThemeClass, applyLanguageAttribute, useSettingsStore } from "@/stores/settings-store";

function App() {
  useCliArgs();

  const { t, language } = useI18n();
  const resolvedTheme = useSettingsStore((state) => state.resolvedTheme);
  const themePreference = useSettingsStore((state) => state.themePreference);
  const refreshResolvedSettings = useSettingsStore(
    (state) => state.refreshResolvedSettings
  );
  const [viewMode, setViewMode] = useState<"table" | "json">("table");
  const [createTableOpen, setCreateTableOpen] = useState(false);
  const [addRowOpen, setAddRowOpen] = useState(false);
  const [renameTableOpen, setRenameTableOpen] = useState(false);
  const [tableToRename, setTableToRename] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [deleteTableOpen, setDeleteTableOpen] = useState(false);
  const [tableToDelete, setTableToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { selectedTable, pageSize, refreshTables, refreshData, selectTable, restoreSession } =
    useDatabaseStore();
  const { toast } = useToast();

  useEffect(() => {
    applyThemeClass(resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    applyLanguageAttribute(language);
  }, [language]);

  // The Rust side keeps the connection alive across a WebView reload, so
  // rebuild the frontend state from it instead of showing "no database".
  useEffect(() => {
    let active = true;
    restoreSession().then((restored) => {
      if (active && restored) {
        toast({
          title: t("common.success"),
          description: t("app.restoredSession"),
        });
      }
    });
    return () => {
      active = false;
    };
    // Runs once on mount; the store actions and `t` are stable enough here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (pageSize === "all" && viewMode === "json") {
      setViewMode("table");
    }
  }, [pageSize, viewMode]);

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

  const handleRenameTable = (name: string) => {
    setTableToRename(name);
    setRenameTableOpen(true);
  };

  const confirmRenameTable = async (newName: string) => {
    if (!tableToRename) return;

    if (newName === tableToRename) {
      setRenameTableOpen(false);
      return;
    }

    setIsRenaming(true);
    try {
      await renameExistingTable(tableToRename, newName);
      await refreshTables();
      if (selectedTable === tableToRename) {
        selectTable(newName);
      }
      toast({
        title: t("common.success"),
        description: t("app.tableRenamed", { table: newName }),
      });
      setRenameTableOpen(false);
      setTableToRename(null);
    } catch (e) {
      toast({
        title: t("common.error"),
        description: String(e),
        variant: "destructive",
      });
    } finally {
      setIsRenaming(false);
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
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[200] focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {t("app.skipToContent")}
        </a>
        <Header />
        <div className="flex-1 flex overflow-hidden">
          <Sidebar
            onCreateTable={handleCreateTable}
            onRenameTable={handleRenameTable}
            onDeleteTable={handleDeleteTable}
          />
          <MainContent>
            <ErrorBanner />
            <div className="border-b p-2 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <h2 className="truncate font-medium text-balance" translate="no">
                  {selectedTable}
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={refreshData}
                  aria-label={t("data.refreshData")}
                >
                  <RefreshCw aria-hidden="true" className="h-4 w-4" />
                </Button>
              </div>
              <DataToolbar />
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAddRowOpen(true)}
                >
                  <Plus aria-hidden="true" className="h-4 w-4 mr-1" />
                  {t("app.addRow")}
                </Button>
                <ColumnManager />
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
      <RenameTableDialog
        open={renameTableOpen}
        currentName={tableToRename}
        onOpenChange={setRenameTableOpen}
        onConfirm={confirmRenameTable}
        isLoading={isRenaming}
      />
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
