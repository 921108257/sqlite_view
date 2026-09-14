import { useDatabaseStore } from "@/stores/database-store";
import { Database } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface MainContentProps {
  children: React.ReactNode;
}

export function MainContent({ children }: MainContentProps) {
  const { isConnected, selectedTable } = useDatabaseStore();
  const { t } = useI18n();

  if (!isConnected) {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 flex items-center justify-center bg-muted/10"
      >
        <div className="text-center">
          <Database
            aria-hidden="true"
            className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4"
          />
          <h2 className="text-xl font-medium text-muted-foreground text-balance">
            {t("main.noDatabaseOpen")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t("main.openDatabaseToStart")}
          </p>
        </div>
      </main>
    );
  }

  if (!selectedTable) {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 flex items-center justify-center bg-muted/10"
      >
        <div className="text-center">
          <h2 className="text-xl font-medium text-muted-foreground text-balance">
            {t("main.selectTable")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t("main.chooseTable")}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex-1 overflow-hidden flex flex-col focus-visible:outline-none"
    >
      {children}
    </main>
  );
}
