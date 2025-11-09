/*
  Generates a matrix of valid CLI configurations for functional testing.
  Excludes unimplemented options: Prisma ORM, Biome, Angular.
  Applies compatibility rules from src/utils/parseCommandLineOptions.ts
*/

type Frontend = 'react' | 'html' | 'svelte' | 'vue' | 'htmx';
type DatabaseEngine = 'postgresql' | 'mysql' | 'sqlite' | 'mongodb' | 'mariadb' | 'gel' | 'singlestore' | 'cockroachdb' | 'mssql' | 'none';
type ORM = 'drizzle' | 'none'; // prisma excluded (not implemented)
type DatabaseHost = 'neon' | 'planetscale' | 'turso' | 'none';
type AuthProvider = 'absoluteAuth' | 'none';
type CodeQualityTool = 'eslint+prettier'; // biome excluded (not implemented)

type Config = {
  frontend: Frontend;
  databaseEngine: DatabaseEngine;
  orm: ORM;
  databaseHost: DatabaseHost;
  authProvider: AuthProvider;
  codeQualityTool?: CodeQualityTool; // optional
  useTailwind: boolean;
  directoryConfig: 'default' | 'custom';
};

const frontends: Frontend[] = ['react', 'html', 'svelte', 'vue', 'htmx'];
const databaseEngines: DatabaseEngine[] = [
  'postgresql',
  'mysql',
  'sqlite',
  'mongodb',
  'mariadb',
  'gel',
  'singlestore',
  'cockroachdb',
  'mssql',
  'none'
];
const orms: ORM[] = ['drizzle', 'none'];
const databaseHosts: DatabaseHost[] = ['neon', 'planetscale', 'turso', 'none'];
const authProviders: AuthProvider[] = ['absoluteAuth', 'none'];
const codeQualityTools: (CodeQualityTool | undefined)[] = ['eslint+prettier', undefined];
const directoryConfigs: Array<'default' | 'custom'> = ['default', 'custom'];
const tailwindOptions: boolean[] = [true, false];

// Drizzle compatible dialects (from src/data.ts: availableDrizzleDialects)
const drizzleCompatible: DatabaseEngine[] = ['gel', 'mysql', 'postgresql', 'sqlite', 'singlestore'];

// DB host constraints (from parseCommandLineOptions)
const hostConstraints: Record<Exclude<DatabaseHost, 'none'>, DatabaseEngine[] | ((db?: DatabaseEngine) => boolean)> = {
  turso: ['sqlite'], // if host= turso, engine must be sqlite
  neon: ['postgresql'], // if host= neon, engine must be postgresql
  planetscale: ['postgresql', 'mysql'] // planetscale supports postgres or mysql
};

/**
 * Determine whether a CLI configuration satisfies supported database, ORM, and host constraints.
 *
 * The following compatibility rules are enforced:
 * - If `orm` is `'drizzle'`, `databaseEngine` must be one of the engines listed in `drizzleCompatible`.
 * - If `databaseEngine` is `'none'`, then `orm` must be `'none'` and `databaseHost` must be `'none'`.
 * - If `databaseHost` is not `'none'`, the host's allowed engines (from `hostConstraints`) must include `databaseEngine`.
 *
 * @param config - The configuration to validate
 * @returns `true` if the configuration satisfies all compatibility rules, `false` otherwise.
 */
function isValid(config: Config): boolean {
  const { databaseEngine, orm, databaseHost } = config;

  // ORM compatibility
  if (orm === 'drizzle') {
    if (databaseEngine === 'none' || !drizzleCompatible.includes(databaseEngine)) return false;
  }

  // No ORM when no DB engine
  if (databaseEngine === 'none' && orm !== 'none') return false;

  // DB host constraints
  if (databaseHost !== 'none') {
    const allowed = hostConstraints[databaseHost as Exclude<DatabaseHost, 'none'>];
    if (Array.isArray(allowed)) {
      if (!allowed.includes(databaseEngine)) return false;
    }
  }

  // If DB engine is none, force host none
  if (databaseEngine === 'none' && databaseHost !== 'none') return false;

  return true;
}

/**
 * Generate all possible CLI configuration combinations and filter them by the compatibility rules.
 *
 * @returns An array of `Config` objects representing every valid configuration combination produced from the Cartesian product of available options and filtered by `isValid`
 */
function generate(): Config[] {
  const results: Config[] = [];
  for (const frontend of frontends) {
    for (const databaseEngine of databaseEngines) {
      for (const orm of orms) {
        for (const databaseHost of databaseHosts) {
          for (const authProvider of authProviders) {
            for (const codeQualityTool of codeQualityTools) {
              for (const directoryConfig of directoryConfigs) {
                for (const useTailwind of tailwindOptions) {
                  const cfg: Config = {
                    frontend,
                    databaseEngine,
                    orm,
                    databaseHost,
                    authProvider,
                    codeQualityTool,
                    directoryConfig,
                    useTailwind
                  };
                  if (isValid(cfg)) results.push(cfg);
                }
              }
            }
          }
        }
      }
    }
  }
  return results;
}

/**
 * Build the matrix of valid CLI configurations, write it to test-matrix.json, and log the result.
 *
 * Writes a pretty-printed JSON file named `test-matrix.json` containing all valid configurations
 * and prints the number of combinations generated and the save path to stdout.
 */
function main() {
  const matrix = generate();
  const outputPath = 'test-matrix.json';
  const fs = require('fs');
  fs.writeFileSync(outputPath, JSON.stringify(matrix, null, 2));
  console.log(`Generated ${matrix.length} valid functional combinations`);
  console.log(`Saved to ${outputPath}`);
}

main();

