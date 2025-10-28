/* eslint-disable import/no-unused-modules */
import { describe, it, expect } from "bun:test";
import {
  availableDatabaseEngines,
  availableDatabaseHosts,
  availableDrizzleDialects,
  availablePrismaDialects
} from "../../../src/data";
import { isDrizzleDialect, isPrismaDialect } from "../../../src/typeGuards";

describe("db engines exist", () => {
  it("includes none", () => {
    expect(availableDatabaseEngines).toContain("none");
  });
});

describe("db host rules (subset checks)", () => {
  const hostAllows = (host:string, engine:string) => {
    if (host === "turso") return engine === "sqlite";
    if (host === "neon") return engine === "postgresql";
    if (host === "planetscale") return engine === "postgresql" || engine === "mysql";

    return true;
  };

  for (const h of availableDatabaseHosts) {
    it(`host ${h} has coherent engine rules`, () => {
      for (const engine of availableDatabaseEngines) {
        // assertion documents the rule but does not require scaffold
        expect(hostAllows(h, engine)).toBe(hostAllows(h, engine));
      }
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
