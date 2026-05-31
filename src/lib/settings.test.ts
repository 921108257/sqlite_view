import { describe, expect, it } from "vitest";
import {
  parseLanguagePreference,
  parseThemePreference,
  resolveLanguagePreference,
  resolveThemePreference,
} from "./settings";

describe("settings resolution", () => {
  it("resolves supported system language tags", () => {
    expect(resolveLanguagePreference("system", "de-DE")).toBe("de");
    expect(resolveLanguagePreference("system", "zh-CN")).toBe("zh-CN");
  });

  it("falls back unsupported system languages to English", () => {
    expect(resolveLanguagePreference("system", "es-ES")).toBe("en");
  });

  it("uses explicit language preference before system language", () => {
    expect(resolveLanguagePreference("ru", "en-US")).toBe("ru");
  });

  it("falls back invalid stored preferences to system", () => {
    expect(parseThemePreference("bad")).toBe("system");
    expect(parseLanguagePreference("bad")).toBe("system");
  });

  it("resolves theme preference from explicit and system values", () => {
    expect(resolveThemePreference("system", true)).toBe("dark");
    expect(resolveThemePreference("system", false)).toBe("light");
    expect(resolveThemePreference("dark", false)).toBe("dark");
  });
});
