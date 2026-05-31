import { create } from "zustand";
import {
  parseLanguagePreference,
  parseThemePreference,
  resolveLanguagePreference,
  resolveThemePreference,
  type LanguagePreference,
  type ResolvedLanguage,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/settings";

const themeStorageKey = "sqlite-view.theme";
const languageStorageKey = "sqlite-view.language";

interface SettingsState {
  themePreference: ThemePreference;
  languagePreference: LanguagePreference;
  resolvedTheme: ResolvedTheme;
  resolvedLanguage: ResolvedLanguage;
  setThemePreference: (preference: ThemePreference) => void;
  setLanguagePreference: (preference: LanguagePreference) => void;
  refreshResolvedSettings: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  themePreference: "system",
  languagePreference: "system",
  resolvedTheme: "light",
  resolvedLanguage: "en",

  setThemePreference: (preference) => {
    writeLocalStorage(themeStorageKey, preference);
    set({
      themePreference: preference,
      resolvedTheme: resolveThemePreference(preference, systemPrefersDark()),
    });
  },

  setLanguagePreference: (preference) => {
    writeLocalStorage(languageStorageKey, preference);
    set({
      languagePreference: preference,
      resolvedLanguage: resolveLanguagePreference(preference, systemLanguage()),
    });
  },

  refreshResolvedSettings: () => {
    const { themePreference, languagePreference } = get();
    set({
      resolvedTheme: resolveThemePreference(themePreference, systemPrefersDark()),
      resolvedLanguage: resolveLanguagePreference(languagePreference, systemLanguage()),
    });
  },
}));

export function initializeSettings() {
  const themePreference = parseThemePreference(readLocalStorage(themeStorageKey));
  const languagePreference = parseLanguagePreference(
    readLocalStorage(languageStorageKey)
  );

  useSettingsStore.setState({
    themePreference,
    languagePreference,
    resolvedTheme: resolveThemePreference(themePreference, systemPrefersDark()),
    resolvedLanguage: resolveLanguagePreference(languagePreference, systemLanguage()),
  });
}

export function applyThemeClass(theme: ResolvedTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function systemPrefersDark() {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function systemLanguage() {
  if (typeof navigator === "undefined") {
    return "en";
  }

  return navigator.language;
}

function readLocalStorage(key: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocalStorage(key: string, value: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Settings are best-effort; the in-memory store still updates.
  }
}
