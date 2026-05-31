import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { languagePreferences, themePreferences } from "@/lib/settings";
import { languageLabelKeys, useI18n } from "@/lib/i18n";
import { useSettingsStore } from "@/stores/settings-store";
import type { LanguagePreference, ThemePreference } from "@/lib/settings";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { t } = useI18n();
  const {
    themePreference,
    languagePreference,
    setThemePreference,
    setLanguagePreference,
  } = useSettingsStore();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("settings.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="theme-preference">
              {t("settings.theme")}
            </label>
            <select
              id="theme-preference"
              value={themePreference}
              onChange={(event) =>
                setThemePreference(event.target.value as ThemePreference)
              }
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {themePreferences.map((preference) => (
                <option key={preference} value={preference}>
                  {t(`settings.theme.${preference}`)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="language-preference">
              {t("settings.language")}
            </label>
            <select
              id="language-preference"
              value={languagePreference}
              onChange={(event) =>
                setLanguagePreference(event.target.value as LanguagePreference)
              }
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {languagePreferences.map((preference) => (
                <option key={preference} value={preference}>
                  {t(languageLabelKeys[preference])}
                </option>
              ))}
            </select>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
