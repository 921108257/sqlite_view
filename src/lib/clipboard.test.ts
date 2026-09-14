import { describe, expect, it } from "vitest";
import {
  cellToSqlLiteral,
  quoteIdentifier,
  quoteLiteral,
  rowToInsertStatement,
  rowToTsv,
} from "./clipboard";

describe("SQL quoting", () => {
  it("doubles embedded double quotes in identifiers", () => {
    expect(quoteIdentifier("plain")).toBe('"plain"');
    expect(quoteIdentifier('we"ird')).toBe('"we""ird"');
  });

  it("doubles embedded single quotes in literals", () => {
    expect(quoteLiteral("it's")).toBe("'it''s'");
    expect(quoteLiteral("plain")).toBe("'plain'");
  });
});

describe("cellToSqlLiteral", () => {
  it("maps null to NULL and numbers unquoted", () => {
    expect(cellToSqlLiteral(null)).toBe("NULL");
    expect(cellToSqlLiteral(42)).toBe("42");
    expect(cellToSqlLiteral(1.5)).toBe("1.5");
  });

  it("quotes text and escapes quotes", () => {
    expect(cellToSqlLiteral("O'Brien")).toBe("'O''Brien'");
    expect(cellToSqlLiteral("")).toBe("''");
  });

  it("maps booleans to 1/0 since SQLite has no boolean type", () => {
    expect(cellToSqlLiteral(true)).toBe("1");
    expect(cellToSqlLiteral(false)).toBe("0");
  });

  it("maps non-finite numbers to NULL rather than an invalid literal", () => {
    expect(cellToSqlLiteral(Number.NaN)).toBe("NULL");
    expect(cellToSqlLiteral(Number.POSITIVE_INFINITY)).toBe("NULL");
  });
});

describe("rowToInsertStatement", () => {
  it("builds a full INSERT with quoted identifiers and literals", () => {
    expect(
      rowToInsertStatement("users", ["id", "name", "note"], [1, "Ada", null])
    ).toBe(
      'INSERT INTO "users" ("id", "name", "note") VALUES (1, \'Ada\', NULL);'
    );
  });

  it("escapes a quote in both the table name and a value", () => {
    expect(rowToInsertStatement('my"table', ["na'me"], ["va'lue"])).toBe(
      'INSERT INTO "my""table" ("na\'me") VALUES (\'va\'\'lue\');'
    );
  });
});

describe("rowToTsv", () => {
  it("joins values with tabs and renders null as empty", () => {
    expect(rowToTsv(["a", null, 3])).toBe("a\t\t3");
  });

  it("escapes tabs and newlines so they cannot fake a column boundary", () => {
    expect(rowToTsv(["a\tb"])).toBe("a\\tb");
    expect(rowToTsv(["a\nb"])).toBe("a\\nb");
    expect(rowToTsv(["a\r\nb"])).toBe("a\\nb");
  });
});
