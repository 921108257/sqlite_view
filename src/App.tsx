import { useState } from "react";
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

function App() {
  // 处理启动时的命令行参数（拖放文件到图标打开）
  useCliArgs();

  const [viewMode, setViewMode] = useState<"table" | "json">("table");
  const [createTableOpen, setCreateTableOpen] = useState(false);
  const [addRowOpen, setAddRowOpen] = useState(false);
  const [deleteTableOpen, setDeleteTableOpen] = useState(false);
  const [tableToDelete, setTableToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { selectedTable, refreshTables, refreshData, selectTable } = useDatabaseStore();
  const { toast } = useToast();

  const handleCreateTable = () => {
    setCreateTableOpen(true);
  };

  const handleRenameTable = async (name: string) => {
    const newName = prompt("Enter new table name:", name);
    if (newName && newName !== name) {
      try {
        await renameExistingTable(name, newName);
        await refreshTables();
        if (selectedTable === name) {
          selectTable(newName);
        }
        toast({ title: "Success", description: `Table renamed to "${newName}"` });
      } catch (e) {
        toast({ title: "Error", description: String(e), variant: "destructive" });
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
      toast({ title: "Success", description: `Table "${tableToDelete}" deleted` });
      setDeleteTableOpen(false);
      setTableToDelete(null);
    } catch (e) {
      toast({ title: "Error", description: String(e), variant: "destructive" });
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
            {/* Toolbar */}
            <div className="border-b p-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="font-medium">{selectedTable}</h2>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={refreshData}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setAddRowOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Row
                </Button>
                <ViewToggle value={viewMode} onChange={setViewMode} />
              </div>
            </div>
            {/* Data View */}
            {viewMode === "table" ? <DataTable /> : <JsonView />}
          </MainContent>
        </div>
      </div>

      {/* Dialogs */}
      <CreateTableDialog open={createTableOpen} onOpenChange={setCreateTableOpen} />
      <AddRowDialog open={addRowOpen} onOpenChange={setAddRowOpen} />
      <DeleteConfirmDialog
        open={deleteTableOpen}
        onOpenChange={setDeleteTableOpen}
        title="Delete Table"
        description={`Are you sure you want to delete table "${tableToDelete}"? This action cannot be undone.`}
        onConfirm={confirmDeleteTable}
        isLoading={isDeleting}
      />
      <Toaster />
    </DropZone>
  );
}

export default App;
