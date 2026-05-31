import { describe, expect, it } from "vitest";
import { JSON_VIEW_ROW_LIMIT, buildJsonViewLines } from "./json-view-helpers";
import type { QueryResult } from "@/types/database";

describe("json view helpers", () => {
  it("formats at most 1000 rows at once", () => {
    const result: QueryResult = {
      columns: ["id", "value"],
      rows: Array.from({ length: JSON_VIEW_ROW_LIMIT + 1 }, (_, index) => [
        index,
        `row-${index}`,
      ]),
      total_count: JSON_VIEW_ROW_LIMIT + 1,
    };

    const lines = buildJsonViewLines(result);

    expect(lines.join("\n")).toContain(`"id": ${JSON_VIEW_ROW_LIMIT - 1}`);
    expect(lines.join("\n")).not.toContain(`"id": ${JSON_VIEW_ROW_LIMIT}`);
  });
});
