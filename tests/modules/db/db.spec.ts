/* eslint-disable import/no-unused-modules */
import { describe, it, expect } from "bun:test";
import {
  availableDatabaseEngines,
  availableDrizzleDialects,
  availablePrismaDialects
} from "../../../src/data";
import { isDrizzleDialect, isPrismaDialect } from "../../../src/typeGuards";
import { hostAllowsEngine } from "../../utils/hostRules";

describe("db engines exist", () => {
  it("includes none", () => {
    expect(availableDatabaseEngines).toContain("none");
  });
});

describe("db host rules (subset checks)", () => {

  const cases: Array<{ host: string; engine: string; expected: boolean }> = [
    { engine: "sqlite", expected: true, host: "turso" },
    { engine: "postgresql", expected: false, host: "turso" },
    { engine: "postgresql", expected: true, host: "neon" },
    { engine: "sqlite", expected: false, host: "neon" },
    { engine: "mysql", expected: true, host: "planetscale" },
    { engine: "postgresql", expected: true, host: "planetscale" },
    { engine: "sqlite", expected: false, host: "planetscale" },
    { engine: "sqlite", expected: true, host: "none" },
    { engine: "postgresql", expected: true, host: "none" },
    { engine: "mysql", expected: true, host: "none" }
  ];

  for (const { host, engine, expected } of cases) {
    it(`host ${host} with engine ${engine} => ${expected}`, () => {
      expect(hostAllowsEngine(host, engine)).toBe(expected);
    });
  }
});

describe("ORM dialect guards", () => {
  it("drizzle dialects are recognized", () => {
    for (const dialect of availableDrizzleDialects) expect(isDrizzleDialect(dialect)).toBeTrue();
  });
  it("prisma dialects are recognized", () => {
    for (const dialect of availablePrismaDialects) expect(isPrismaDialect(dialect)).toBeTrue();
  });
});
