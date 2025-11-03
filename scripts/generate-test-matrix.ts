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

function main() {
  const matrix = generate();
  const outputPath = 'test-matrix.json';
  const fs = require('fs');
  fs.writeFileSync(outputPath, JSON.stringify(matrix, null, 2));
  console.log(`Generated ${matrix.length} valid functional combinations`);
  console.log(`Saved to ${outputPath}`);
}

main();


