import { describe, expect, it } from "vitest";
import { formatCount } from "./format";

describe("formatCount", () => {
  it("groups thousands for English", () => {
    expect(formatCount(1234, "en")).toBe("1,234");
    expect(formatCount(1000000, "en")).toBe("1,000,000");
  });

  it("uses locale-specific grouping separators", () => {
    expect(formatCount(1234, "de")).toBe("1.234");
    // fr-FR groups with a narrow no-break space.
    expect(formatCount(1234, "fr")).toMatch(/^1\s?234$/);
  });

  it("leaves small numbers ungrouped", () => {
    expect(formatCount(0, "en")).toBe("0");
    expect(formatCount(42, "en")).toBe("42");
  });

  it("falls back to English for an invalid locale instead of throwing", () => {
    expect(formatCount(1234, "not a locale!!")).toBe("1,234");
  });

  it("returns non-finite values as-is", () => {
    expect(formatCount(Number.NaN, "en")).toBe("NaN");
    expect(formatCount(Number.POSITIVE_INFINITY, "en")).toBe("Infinity");
  });
});
