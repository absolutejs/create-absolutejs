// Run with: bun run tests/validate-compat.ts
// Purpose: Validate tests/compat.json for structure, statuses, and rule references.

import fs from "node:fs";

// ---- Types to make intent explicit -----------------------------------------

type Status = "works" | "unknown" | "excluded";

type Item = {
  name: string;          // canonical option key, e.g., "react"
  status: Status;        // current support status
  reason?: string;       // optional human note for exclusions
};

type Rule = {
  // Minimal keys to describe a constraint. Examples:
  // { "framework": "angular" }
  // { "orm": "drizzle", "db.engine": "mysql" }
  when: Record<string, string>;
  status: Status;        // how to treat this combination
  note?: string;         // optional explanation
};

type Compat = {
  _meta?: unknown;
  frameworks: Item[];
  databases: {
    engines: Item[];
    hosts?: Item[]; // optional but recommended
  };
  orms: Item[];
  auth: { providers: Item[] };
  formatters: Item[];
  rules?: Rule[];
};

// ---- Helpers ----------------------------------------------------------------

const readJSON = <T>(path: string): T =>
  JSON.parse(fs.readFileSync(path, "utf8")) as T;

// Build a fast lookup Set<string> for a list of items.
const toNameSet = (items: Item[] | undefined) =>
  new Set((items ?? []).map((x) => x.name));

// Assert utility. Throws with a clear message.
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

// Pretty-print a set; useful in error messages.
const list = (s: Set<string>) => [...s].sort().join(", ");

// Validate a single status value.
const isStatus = (x: any): x is Status =>
  x === "works" || x === "unknown" || x === "excluded";

// ---- Load compat.json -------------------------------------------------------

const compat = readJSON<Compat>("tests/compat.json");

// ---- 1) Required top-level sections ----------------------------------------

assert(Array.isArray(compat.frameworks), "Missing 'frameworks' array.");
assert(compat.databases?.engines, "Missing 'databases.engines' array.");
assert(Array.isArray(compat.orms), "Missing 'orms' array.");
assert(compat.auth?.providers, "Missing 'auth.providers' array.");
assert(Array.isArray(compat.formatters), "Missing 'formatters' array.");

// ---- 2) Validate item shapes and statuses ----------------------------------

function validateItemArray(name: string, items: Item[]) {
  for (const it of items) {
    assert(typeof it.name === "string" && it.name.length > 0, `[${name}] item missing valid 'name'.`);
    assert(isStatus(it.status), `[${name}] '${it.name}' has invalid status '${(it as any).status}'. Use works|unknown|excluded.`);
  }
}

validateItemArray("frameworks", compat.frameworks);
validateItemArray("databases.engines", compat.databases.engines);
validateItemArray("orms", compat.orms);
validateItemArray("auth.providers", compat.auth.providers);
validateItemArray("formatters", compat.formatters);
if (compat.databases.hosts) validateItemArray("databases.hosts", compat.databases.hosts);

// ---- 3) Build name lookup sets for cross-references -------------------------

const F = toNameSet(compat.frameworks);
const DE = toNameSet(compat.databases.engines);
const H = toNameSet(compat.databases.hosts ?? []);
const O = toNameSet(compat.orms);
const A = toNameSet(compat.auth.providers);
const FM = toNameSet(compat.formatters);

// Sanity: must not be empty.
assert(F.size > 0, "No frameworks defined.");
assert(DE.size > 0, "No database engines defined.");
assert(O.size > 0, "No ORMs defined.");
assert(A.size > 0, "No auth providers defined.");
assert(FM.size > 0, "No formatters defined.");

// ---- 4) Validate rules[] references ----------------------------------------

for (const r of compat.rules ?? []) {
  assert(r.when && typeof r.when === "object", "Rule missing 'when' object.");
  assert(isStatus(r.status), `Rule has invalid status '${(r as any).status}'.`);

  for (const [k, v] of Object.entries(r.when)) {
    // We accept a limited vocabulary of keys to avoid silent typos.
    switch (k) {
      case "framework":
        assert(F.has(v), `Rule references unknown framework '${v}'. Known: ${list(F)}`);
        break;
      case "db.engine":
        assert(DE.has(v), `Rule references unknown db.engine '${v}'. Known: ${list(DE)}`);
        break;
      case "db.host":
        assert(H.has(v), `Rule references unknown db.host '${v}'. Known: ${list(H)}`);
        break;
      case "orm":
        assert(O.has(v), `Rule references unknown orm '${v}'. Known: ${list(O)}`);
        break;
      case "auth.provider":
        assert(A.has(v), `Rule references unknown auth.provider '${v}'. Known: ${list(A)}`);
        break;
      case "formatter":
        assert(FM.has(v), `Rule references unknown formatter '${v}'. Known: ${list(FM)}`);
        break;
      default:
        throw new Error(
          `Rule uses unsupported key '${k}'. Allowed keys: framework | db.engine | db.host | orm | auth.provider | formatter`
        );
    }
  }
}

// ---- 5) Optional coherence checks (low-cost, high value) -------------------

// Example: If a host exists, its "none" entry should exist in engines or hosts.
// Not hard requirements, but they guard common mistakes.

if (H.size > 0) {
  assert(DE.has("none"), "Recommended: include engine 'none' for clarity.");
  assert(H.has("none"), "Recommended: include host 'none' for clarity.");
}

// Example: Angular must be excluded per project policy.
// If you ever flip this, remove the check.
{
  const angular = compat.frameworks.find((x) => x.name === "angular");
  assert(
    !angular || angular.status === "excluded",
    "Policy: 'angular' must be status: 'excluded'."
  );
}

// Example: Auth baseline must include 'none' as works.
{
  const noneAuth = compat.auth.providers.find((x) => x.name === "none");
  assert(
    noneAuth && noneAuth.status === "works",
    "Policy: auth.providers must include { name: 'none', status: 'works' }."
  );
}

// ---- 6) If we got here, file is valid --------------------------------------

console.log("compat.json validated");
