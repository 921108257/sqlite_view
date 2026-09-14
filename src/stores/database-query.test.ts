import { describe, expect, it } from "vitest";
import { ALL_ROWS_BATCH_SIZE, buildTableQueryParams } from "./database-query";

describe("database query params", () => {
  it("loads all-row mode in 500-row chunks", () => {
    expect(
      buildTableQueryParams({
        table: "items",
        currentPage: 0,
        pageSize: "all",
        orderBy: null,
        orderDir: "ASC",
        filters: [],
      })
    ).toEqual({
      table: "items",
      limit: ALL_ROWS_BATCH_SIZE,
      offset: 0,
    });
  });

  it("can request the next all-row chunk", () => {
    expect(
      buildTableQueryParams({
        table: "items",
        currentPage: 0,
        pageSize: "all",
        orderBy: null,
        orderDir: "ASC",
        filters: [],
        allRowsOffset: 500,
      })
    ).toEqual({
      table: "items",
      limit: ALL_ROWS_BATCH_SIZE,
      offset: 500,
    });
  });

  it("keeps normal page sizes paged", () => {
    expect(
      buildTableQueryParams({
        table: "items",
        currentPage: 3,
        pageSize: 100,
        orderBy: "id",
        orderDir: "DESC",
        filters: [],
      })
    ).toEqual({
      table: "items",
      limit: 100,
      offset: 300,
      order_by: "id",
      order_dir: "DESC",
    });
  });

  it("omits the search term when it is blank or whitespace", () => {
    for (const globalSearch of ["", "   ", undefined]) {
      expect(
        buildTableQueryParams({
          table: "items",
          currentPage: 0,
          pageSize: 50,
          orderBy: null,
          orderDir: "ASC",
          filters: [],
          globalSearch,
        }).global_search
      ).toBeUndefined();
    }
  });

  it("trims and forwards a real search term", () => {
    expect(
      buildTableQueryParams({
        table: "items",
        currentPage: 0,
        pageSize: 50,
        orderBy: null,
        orderDir: "ASC",
        filters: [],
        globalSearch: "  needle  ",
      }).global_search
    ).toBe("needle");
  });
});
