# Settings Design

## Goal

Add application settings for theme and language without adding a full i18n framework.

The settings must support:

- Theme preference: follow system, light, dark.
- Language preference: follow system, Simplified Chinese, English, Japanese, Korean, German, French, Russian.
- Unsupported system languages fall back to English.

## Approach

Use a lightweight local settings layer and a small translation dictionary.

The app already uses Tailwind class-based dark mode via the `dark` class and CSS variables in `src/index.css`, so theme switching should only manage the class on `document.documentElement`. Settings should be persisted in `localStorage` so the app restores the user's choices on restart.

English is the canonical fallback language. The English strings live in the dictionary as the baseline copy, but the language resolution logic should not need future changes for English fallback behavior; it should resolve to English whenever the chosen or detected language is unsupported.

## UI

Add a settings button to the header. The button opens a settings dialog with two controls:

- Theme: System, Light, Dark.
- Language: System, Simplified Chinese, English, Japanese, Korean, German, French, Russian.

Use existing UI primitives where possible. Add a small select primitive only if the current components do not provide a suitable option control.

## State And Data Flow

Create an app settings store at `src/stores/settings-store.ts`, with:

- `themePreference`: `"system" | "light" | "dark"`.
- `languagePreference`: `"system" | "zh-CN" | "en" | "ja" | "ko" | "de" | "fr" | "ru"`.
- Resolved theme based on the saved preference and `prefers-color-scheme`.
- Resolved language based on the saved preference and `navigator.language`.
- Setter functions that persist changes to `localStorage`.

Theme resolution should listen for system color-scheme changes only while the preference is `system`.

Language resolution should normalize common browser language tags:

- `zh` and `zh-CN` resolve to `zh-CN`.
- `en`, `ja`, `ko`, `de`, `fr`, and `ru` resolve to their matching supported language.
- Unsupported values resolve to `en`.

## Localization

Create a small dictionary module at `src/lib/i18n.ts`, with:

- Supported language metadata for labels.
- A typed translation key map.
- A translation hook or helper that reads the resolved language from the settings store.

Translate the current user-facing static UI strings in React components, including header actions, empty states, dialogs, table controls, prompts, confirmations, and toast titles/descriptions. Avoid moving database identifiers, table names, SQL values, or file paths through translation.

## Error Handling

If stored settings are missing or invalid, ignore them and use `system`.

If the browser does not expose `matchMedia` or `navigator.language`, resolve theme to light and language to English.

## Testing

Add tests for pure settings and language resolution helpers:

- Theme preference resolves system/light/dark correctly.
- Language preference resolves supported languages correctly.
- Unsupported system language falls back to English.
- Invalid stored settings fall back to `system`.

Run the existing TypeScript build after implementation.
