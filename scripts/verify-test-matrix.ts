/*
  Verifies test-matrix.json only contains valid, implemented combinations.
  Ensures excluded options and invalid pairings are not present.
*/

type DatabaseEngine = 'postgresql' | 'mysql' | 'sqlite' | 'mongodb' | 'mariadb' | 'gel' | 'singlestore' | 'cockroachdb' | 'mssql' | 'none';
type ORM = 'drizzle' | 'none';
type DatabaseHost = 'neon' | 'planetscale' | 'turso' | 'none';
type Frontend = 'react' | 'html' | 'svelte' | 'vue' | 'htmx';
type AuthProvider = 'absoluteAuth' | 'none';
type CodeQualityTool = 'eslint+prettier' | undefined;

type Config = {
  frontend: Frontend;
  databaseEngine: DatabaseEngine;
  orm: ORM;
  databaseHost: DatabaseHost;
  authProvider: AuthProvider;
  codeQualityTool?: CodeQualityTool;
  useTailwind: boolean;
  directoryConfig: 'default' | 'custom';
};

const drizzleCompatible: DatabaseEngine[] = ['gel', 'mysql', 'postgresql', 'sqlite', 'singlestore'];

const hostConstraints: Record<Exclude<DatabaseHost, 'none'>, DatabaseEngine[]> = {
  turso: ['sqlite'],
  neon: ['postgresql'],
  planetscale: ['postgresql', 'mysql']
};

/**
 * Ensures a condition is met and throws an Error when it is not.
 *
 * @param condition - The condition to assert.
 * @param message - The error message to throw when the assertion fails.
 * @throws Error if `condition` is false.
 */
function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

/**
 * Validates a single Config entry from the test matrix.
 *
 * Performs enumeration checks for frontend, orm, databaseHost, databaseEngine, authProvider, and codeQualityTool;
 * enforces ORM/engine compatibility (e.g., `drizzle` requires a compatible engine), requires `orm` and `databaseHost` to be `none` when `databaseEngine` is `none`,
 * and enforces host-specific engine constraints.
 *
 * @param cfg - The configuration entry to validate
 * @param idx - Index of the entry in the matrix; used to produce contextual error messages
 * @throws Error If any validation rule fails; the thrown message includes the entry index and the failing constraint
 */
function validateEntry(cfg: Config, idx: number) {
  // Enumerations safety
  assert(['react','html','svelte','vue','htmx'].includes(cfg.frontend), `[${idx}] invalid frontend ${cfg.frontend}`);
  assert(['drizzle','none'].includes(cfg.orm), `[${idx}] invalid orm ${cfg.orm}`);
  assert(['neon','planetscale','turso','none'].includes(cfg.databaseHost), `[${idx}] invalid host ${cfg.databaseHost}`);
  assert([
    'postgresql','mysql','sqlite','mongodb','mariadb','gel','singlestore','cockroachdb','mssql','none'
  ].includes(cfg.databaseEngine), `[${idx}] invalid engine ${cfg.databaseEngine}`);
  assert(cfg.authProvider === 'absoluteAuth' || cfg.authProvider === 'none', `[${idx}] invalid auth ${cfg.authProvider}`);
  assert(cfg.codeQualityTool === undefined || cfg.codeQualityTool === 'eslint+prettier', `[${idx}] invalid code quality ${cfg.codeQualityTool}`);

  // ORM compatibility
  if (cfg.orm === 'drizzle') {
    assert(cfg.databaseEngine !== 'none', `[${idx}] drizzle with no engine`);
    assert(drizzleCompatible.includes(cfg.databaseEngine), `[${idx}] drizzle with incompatible engine ${cfg.databaseEngine}`);
  }

  // No ORM with no engine
  if (cfg.databaseEngine === 'none') {
    assert(cfg.orm === 'none', `[${idx}] engine none but orm ${cfg.orm}`);
    assert(cfg.databaseHost === 'none', `[${idx}] engine none but host ${cfg.databaseHost}`);
  }

  // Host constraints
  if (cfg.databaseHost !== 'none') {
    const allowed = hostConstraints[cfg.databaseHost as Exclude<DatabaseHost,'none'>];
    assert(allowed.includes(cfg.databaseEngine), `[${idx}] host ${cfg.databaseHost} incompatible with engine ${cfg.databaseEngine}`);
  }
}

/**
 * Validate test-matrix.json contents against the project's matrix constraints.
 *
 * Reads the local test-matrix.json, verifies it is a non-empty array, validates each entry with the project's rules, and performs additional spot-checks for excluded values.
 *
 * @throws Error if test-matrix.json is missing, empty, any entry fails validation, or excluded values (e.g., `biome`, `prisma`) are present.
 */
function main() {
  const fs = require('fs');
  const path = 'test-matrix.json';
  assert(fs.existsSync(path), 'test-matrix.json not found. Run gen:matrix first.');
  const data = JSON.parse(fs.readFileSync(path, 'utf8')) as Config[];
  assert(Array.isArray(data) && data.length > 0, 'Matrix is empty.');

  data.forEach((cfg, i) => validateEntry(cfg, i));

  // Spot checks to ensure exclusions are respected
  const hasBiome = data.some((c) => (c as any).codeQualityTool === 'biome');
  assert(!hasBiome, 'Found biome entries (should be excluded).');
  const hasPrisma = data.some((c) => (c as any).orm === 'prisma');
  assert(!hasPrisma, 'Found prisma entries (should be excluded).');

  console.log(`Matrix verification passed. ${data.length} entries validated.`);
}

main();

