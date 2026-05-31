import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";

interface RenameTableDialogProps {
  open: boolean;
  currentName: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (newName: string) => void;
  isLoading?: boolean;
}

export function RenameTableDialog({
  open,
  currentName,
  onOpenChange,
  onConfirm,
  isLoading,
}: RenameTableDialogProps) {
  const { t } = useI18n();
  const [name, setName] = useState(currentName ?? "");
  const trimmedName = name.trim();
  const canSubmit = Boolean(trimmedName) && trimmedName !== currentName && !isLoading;

  useEffect(() => {
    if (open) {
      setName(currentName ?? "");
    }
  }, [currentName, open]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    onConfirm(trimmedName);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{t("sidebar.rename")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="rename-table-name">
              {t("app.renameTablePrompt")}
            </label>
            <Input
              id="rename-table-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {t("sidebar.rename")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
