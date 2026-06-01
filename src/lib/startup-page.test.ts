import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(__dirname, "../..");

describe("startup page", () => {
  it("renders a theme-aware loading placeholder before React mounts", () => {
    const html = readFileSync(resolve(projectRoot, "index.html"), "utf8");

    expect(html).toContain("sqlite-view.theme");
    expect(html).toContain("html.dark");
    expect(html).toContain("sqlite-view-boot-spin");
    expect(html).toContain("#root:empty::after");
  });
});
