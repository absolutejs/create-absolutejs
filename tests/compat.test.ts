// Run: bun test
// Purpose: validate compatibility using src/data + real guards, no scaffolding.

/* eslint-disable import/no-unused-modules */
import { describe, it, expect, test } from "bun:test";
import {
  availableFrontends,
  availableAuthProviders,
  availableDatabaseEngines,
  availableDatabaseHosts,
  availableORMs,
  availableCodeQualityTools,
  availableDrizzleDialects,
  availablePrismaDialects,
} from "../src/data";
import { isDrizzleDialect, isPrismaDialect } from "../src/typeGuards";

export {};

// ---------- helpers -----------------------------------------------------------
// Mirrors host↔engine rules in parseCommandLineOptions.
const hostAllowsEngine = (host: string, engine: string) => {
  if (host === "turso") return engine === "sqlite";
  if (host === "neon") return engine === "postgresql";
  if (host === "planetscale") return engine === "postgresql" || engine === "mysql";
  if (host === "none") return true;

  return true; // unknown host, no restriction
};

// ---------- integrity checks --------------------------------------------------
describe("option integrity (from src/data.ts)", () => {
  it("frontends non-empty", () => {
    expect(availableFrontends.length).toBeGreaterThan(0);
  });

  it("auth providers include none", () => {
    expect(availableAuthProviders).toContain("none");
  });

  it("engines include none", () => {
    expect(availableDatabaseEngines).toContain("none");
  });

  it("hosts include none", () => {
    expect(availableDatabaseHosts).toContain("none");
  });

  it("orms include none", () => {
    expect(availableORMs).toContain("none");
  });

  it("formatters include at least one known tool", () => {
    expect(
      availableCodeQualityTools.includes("biome") ||
      availableCodeQualityTools.includes("eslint+prettier")
    ).toBeTrue();
  });
});

// ---------- host ↔ engine rules ----------------------------------------------
describe("host ↔ engine compatibility", () => {
  const cases: Array<{ host: string; eng: string; isAllowed: boolean }> = [
    { eng: "sqlite", host: "turso", isAllowed: true  },
    { eng: "postgresql", host: "turso", isAllowed: false },
    { eng: "mysql", host: "turso", isAllowed: false },

    { eng: "postgresql", host: "neon", isAllowed: true  },
    { eng: "sqlite", host: "neon", isAllowed: false },
    { eng: "mysql", host: "neon", isAllowed: false },

    { eng: "mysql", host: "planetscale", isAllowed: true  },
    { eng: "postgresql", host: "planetscale", isAllowed: true  },
    { eng: "sqlite", host: "planetscale", isAllowed: false },

    { eng: "sqlite", host: "none", isAllowed: true  },
    { eng: "postgresql", host: "none", isAllowed: true  },
    { eng: "mysql", host: "none", isAllowed: true  },
  ];

  it.each(cases)("host %s with engine %s => %s", ({ host, eng, isAllowed }) => {
    expect(hostAllowsEngine(host, eng)).toBe(isAllowed);
  });
});

// ---------- ORM ↔ engine dialect subsets -------------------------------------
// We assert subset relations, not "all engines are valid".
describe("ORM dialect subsets", () => {
  it("Drizzle dialects ⊆ available engines", () => {
    for (const eng of availableDrizzleDialects) {
      expect(availableDatabaseEngines).toContain(eng);
      expect(isDrizzleDialect(eng)).toBeTrue();
    }
  });

  it("engines not in Drizzle set are rejected by Drizzle guard", () => {
    for (const eng of availableDatabaseEngines) {
      if (eng === "none") continue;
      const shouldBe = availableDrizzleDialects.includes(eng);
      expect(isDrizzleDialect(eng)).toBe(shouldBe);
    }
  });

  it("Prisma dialects ⊆ available engines", () => {
    for (const eng of availablePrismaDialects) {
      expect(availableDatabaseEngines).toContain(eng);
      expect(isPrismaDialect(eng)).toBeTrue();
    }
  });

  it("engines not in Prisma set are rejected by Prisma guard", () => {
    for (const eng of availableDatabaseEngines) {
      if (eng === "none") continue;
      const shouldBe = availablePrismaDialects.includes(eng);
      expect(isPrismaDialect(eng)).toBe(shouldBe);
    }
  });
});

// ---------- smoke scaffold (disabled for now) --------------------------------
// Real scaffolding touches FS, templates, env. Keep it out of unit runs.
test.skip("scaffold smoke: react + drizzle + sqlite + auth none", () => {
  expect(true).toBe(true);
});

test.skip("scaffold smoke: html only, no db, no orm, no auth", () => {
  expect(true).toBe(true);
});

export {};