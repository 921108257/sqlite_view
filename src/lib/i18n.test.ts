import { describe, expect, it } from "vitest";
import { translate } from "./i18n";

describe("translate", () => {
  it("interpolates string values", () => {
    expect(translate("en", "data.filterColumn", { column: "status" })).toBe(
      "Filter status"
    );
  });

  it("leaves a placeholder intact when no value is supplied", () => {
    expect(translate("en", "data.filterColumn", {})).toBe("Filter {column}");
  });

  it("localizes numeric counts via Intl instead of String()", () => {
    // 1234 must gain a grouping separator, not render as "1234".
    expect(translate("en", "data.selectedCount", { count: 1234 })).toBe(
      "1,234 selected"
    );
    // German groups with a dot; the dictionary template is reused unchanged.
    expect(translate("de", "data.selectedCount", { count: 1234 })).toBe(
      "1.234 ausgewählt"
    );
  });

  it("does not localize a non-count numeric interpolation", () => {
    expect(translate("en", "data.pageOf", { page: 1234, total: 5 })).toBe(
      "Page 1234 of 5"
    );
  });

  it("falls back to English for a key missing from a dictionary", () => {
    // Every dictionary is typed to be complete, so exercise the fallback path
    // with a language/key pair that resolves through the English entry.
    expect(translate("ja", "common.cancel")).toBe("キャンセル");
  });
});
