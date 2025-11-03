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

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

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


