export const themePreferences = ["system", "light", "dark"] as const;

export type ThemePreference = (typeof themePreferences)[number];
export type ResolvedTheme = Exclude<ThemePreference, "system">;

export const languagePreferences = [
  "system",
  "zh-CN",
  "en",
  "ja",
  "ko",
  "de",
  "fr",
  "ru",
] as const;

export type LanguagePreference = (typeof languagePreferences)[number];
export type ResolvedLanguage = Exclude<LanguagePreference, "system">;

export const supportedLanguages = languagePreferences.filter(
  (language): language is ResolvedLanguage => language !== "system"
);

export function parseThemePreference(value: unknown): ThemePreference {
  return themePreferences.includes(value as ThemePreference)
    ? (value as ThemePreference)
    : "system";
}

export function parseLanguagePreference(value: unknown): LanguagePreference {
  return languagePreferences.includes(value as LanguagePreference)
    ? (value as LanguagePreference)
    : "system";
}

export function resolveThemePreference(
  preference: ThemePreference,
  systemPrefersDark: boolean
): ResolvedTheme {
  if (preference === "system") {
    return systemPrefersDark ? "dark" : "light";
  }

  return preference;
}

export function resolveLanguagePreference(
  preference: LanguagePreference,
  systemLanguage: string | null | undefined
): ResolvedLanguage {
  if (preference !== "system") {
    return preference;
  }

  return resolveSystemLanguage(systemLanguage);
}

function resolveSystemLanguage(
  systemLanguage: string | null | undefined
): ResolvedLanguage {
  if (!systemLanguage) {
    return "en";
  }

  const normalized = systemLanguage.toLowerCase();
  const baseLanguage = normalized.split("-")[0];

  if (baseLanguage === "zh") {
    return "zh-CN";
  }

  if (isSupportedLanguage(baseLanguage)) {
    return baseLanguage;
  }

  return "en";
}

function isSupportedLanguage(value: string): value is ResolvedLanguage {
  return supportedLanguages.includes(value as ResolvedLanguage);
}
