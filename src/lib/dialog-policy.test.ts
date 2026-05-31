import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(__dirname, "../..");

function readSource(path: string) {
  return readFileSync(resolve(projectRoot, path), "utf8");
}

describe("dialog policy", () => {
  it("does not use browser-native prompt or confirm dialogs for app workflows", () => {
    const source = [
      readSource("src/App.tsx"),
      readSource("src/components/data-view/data-table.tsx"),
    ].join("\n");

    expect(source).not.toMatch(/\bprompt\s*\(/);
    expect(source).not.toMatch(/\bconfirm\s*\(/);
  });
});
