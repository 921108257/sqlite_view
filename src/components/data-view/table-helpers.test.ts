import { describe, expect, it } from "vitest";
import {
  COLUMN_MIN_WIDTH,
  getTotalPages,
  getVirtualRowWindow,
  resolveFilterPanelSide,
} from "./table-helpers";

describe("data table helpers", () => {
  it("treats all rows as a single page", () => {
    expect(getTotalPages(2400, "all")).toBe(1);
    expect(getTotalPages(0, "all")).toBe(1);
  });

  it("uses 180px as the minimum column width", () => {
    expect(COLUMN_MIN_WIDTH).toBe(180);
  });

  it("opens the filter panel to the right unless there is not enough space", () => {
    expect(resolveFilterPanelSide({ triggerRight: 520, triggerLeft: 480, viewportWidth: 900 })).toBe(
      "right"
    );
    expect(resolveFilterPanelSide({ triggerRight: 760, triggerLeft: 720, viewportWidth: 900 })).toBe(
      "left"
    );
  });

  it("windows large row sets to the visible range plus overscan", () => {
    expect(
      getVirtualRowWindow({
        rowCount: 1_000_000,
        scrollTop: 3200,
        viewportHeight: 320,
        rowHeight: 32,
        overscan: 4,
      })
    ).toEqual({
      start: 96,
      end: 114,
      topPadding: 3072,
      bottomPadding: 31_996_352,
    });
  });
});
