import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { Upload } from "lucide-react";
import { useDatabaseStore } from "@/stores/database-store";

interface DropZoneProps {
  children: React.ReactNode;
}

interface FileDropPayload {
  paths: string[];
}

export function DropZone({ children }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const { openDatabase } = useDatabaseStore();

  useEffect(() => {
    const unlistenDrop = listen<FileDropPayload>("tauri://drag-drop", async (event) => {
      setIsDragging(false);
      const paths = event.payload.paths;
      if (paths.length > 0) {
        const path = paths[0];
        const ext = path.split(".").pop()?.toLowerCase();
        if (["db", "sqlite", "sqlite3", "db3"].includes(ext ?? "")) {
          await openDatabase(path);
        }
      }
    });

    const unlistenEnter = listen("tauri://drag-enter", () => {
      setIsDragging(true);
    });

    const unlistenLeave = listen("tauri://drag-leave", () => {
      setIsDragging(false);
    });

    return () => {
      unlistenDrop.then((fn) => fn());
      unlistenEnter.then((fn) => fn());
      unlistenLeave.then((fn) => fn());
    };
  }, [openDatabase]);

  return (
    <div className="relative h-full">
      {children}
      {isDragging && (
        <div className="absolute inset-0 bg-primary/10 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-background border-2 border-dashed border-primary rounded-lg p-8 text-center">
            <Upload className="h-12 w-12 text-primary mx-auto mb-4" />
            <p className="text-lg font-medium">Drop SQLite file here</p>
            <p className="text-sm text-muted-foreground mt-1">
              Supports .db, .sqlite, .sqlite3, .db3
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
