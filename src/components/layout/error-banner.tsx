import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDatabaseStore } from "@/stores/database-store";
import { useI18n } from "@/lib/i18n";

/**
 * Surfaces `store.error`. Previously the store recorded errors (failed open,
 * failed query, dropped table) but nothing rendered them, so failures were
 * silent and the UI simply looked unchanged.
 */
export function ErrorBanner() {
  const error = useDatabaseStore((state) => state.error);
  const clearError = useDatabaseStore((state) => state.clearError);
  const { t } = useI18n();

  if (!error) return null;

  return (
    <div
      role="alert"
      className="flex items-start gap-2 border-b border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="min-w-0 flex-1 break-words">{error}</p>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 text-destructive hover:bg-destructive/20"
        onClick={clearError}
        aria-label={t("data.dismissError")}
      >
        <X aria-hidden="true" className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
