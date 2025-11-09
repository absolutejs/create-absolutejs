import { existsSync, rmSync } from 'node:fs';
import process from 'node:process';
import { cleanupCache } from './dependency-cache';
import { cleanupProjectDirectory } from './test-utils';

type SuiteGroup = 'core' | 'framework' | 'database' | 'cloud' | 'auth';

type SuiteDefinition = {
  args?: string[];
  databases?: string[];
  description: string;
  frameworks?: string[];
  group: SuiteGroup;
  label: string;
  name: string;
  providers?: string[];
  script: string;
};

type CliOptions = {
  all: boolean;
  ciMode: boolean;
  clean: boolean;
  databaseFilters: string[];
  dryRun: boolean;
  frameworkFilters: string[];
  help: boolean;
  includeAuth: boolean;
  includeCloud: boolean;
  list: boolean;
  providers: string[];
  suites: string[];
};

type CommandOptions = {
  env?: Record<string, string>;
  stderr?: 'inherit' | 'pipe';
  stdin?: 'inherit' | 'ignore';
  stdout?: 'inherit' | 'pipe';
};

type SuiteExecution = {
  duration: number;
  exitCode: number;
  label: string;
  name: string;
};

const SUITE_DEFINITIONS: SuiteDefinition[] = [
  {
    description: 'Runs dependency, build, and server validators sequentially.',
    group: 'core',
    label: 'Functional core',
    name: 'functional',
    script: 'scripts/functional-tests/functional-test-runner.ts'
  },
  {
    description: 'Validates the scaffolded server boots successfully.',
    group: 'core',
    label: 'Server validator',
    name: 'server',
    script: 'scripts/functional-tests/server-startup-validator.ts'
  },
  {
    description: 'Checks the build pipeline compiles without errors.',
    group: 'core',
    label: 'Build validator',
    name: 'build',
    script: 'scripts/functional-tests/build-validator.ts'
  },
  {
    description: 'Ensures dependency installation succeeds.',
    group: 'core',
    label: 'Dependency installer',
    name: 'deps',
    script: 'scripts/functional-tests/dependency-installer-tester.ts'
  },
  {
    description: 'Runs the full React matrix.',
    frameworks: ['react'],
    group: 'framework',
    label: 'React suite',
    name: 'react',
    script: 'scripts/functional-tests/react-test-runner.ts'
  },
  {
    description: 'Runs the full Vue matrix.',
    frameworks: ['vue'],
    group: 'framework',
    label: 'Vue suite',
    name: 'vue',
    script: 'scripts/functional-tests/vue-test-runner.ts'
  },
  {
    description: 'Runs the full Svelte matrix.',
    frameworks: ['svelte'],
    group: 'framework',
    label: 'Svelte suite',
    name: 'svelte',
    script: 'scripts/functional-tests/svelte-test-runner.ts'
  },
  {
    description: 'Runs the HTML framework matrix.',
    frameworks: ['html'],
    group: 'framework',
    label: 'HTML suite',
    name: 'html',
    script: 'scripts/functional-tests/html-test-runner.ts'
  },
  {
    description: 'Runs the HTMX framework matrix.',
    frameworks: ['htmx'],
    group: 'framework',
    label: 'HTMX suite',
    name: 'htmx',
    script: 'scripts/functional-tests/htmx-test-runner.ts'
  },
  {
    databases: ['sqlite'],
    description: 'Runs SQLite database validations (local + Turso).',
    group: 'database',
    label: 'SQLite suite',
    name: 'sqlite',
    script: 'scripts/functional-tests/sqlite-test-runner.ts'
  },
  {
    databases: ['postgresql'],
    description: 'Runs PostgreSQL database validations (Neon/local).',
    group: 'database',
    label: 'PostgreSQL suite',
    name: 'postgresql',
    script: 'scripts/functional-tests/postgresql-test-runner.ts'
  },
  {
    databases: ['mysql'],
    description: 'Runs MySQL database validations (PlanetScale/local).',
    group: 'database',
    label: 'MySQL suite',
    name: 'mysql',
    script: 'scripts/functional-tests/mysql-test-runner.ts'
  },
  {
    databases: ['mongodb'],
    description: 'Runs MongoDB database validations.',
    group: 'database',
    label: 'MongoDB suite',
    name: 'mongodb',
    script: 'scripts/functional-tests/mongodb-test-runner.ts'
  },
  {
    description: 'Runs supported cloud provider combinations.',
    group: 'cloud',
    label: 'Cloud providers',
    name: 'cloud',
    providers: ['neon', 'turso'],
    script: 'scripts/functional-tests/cloud-provider-test-runner.ts'
  },
  {
    description: 'Runs absoluteAuth matrix validations.',
    group: 'auth',
    label: 'Auth suite',
    name: 'auth',
    script: 'scripts/functional-tests/auth-test-runner.ts'
  }
];

const SUITE_MAP = new Map<string, SuiteDefinition>(
  SUITE_DEFINITIONS.map((definition) => [definition.name, definition])
);

const VALID_FRAMEWORKS = new Set(['react', 'vue', 'svelte', 'html', 'htmx']);
const VALID_DATABASES = new Set(['sqlite', 'postgresql', 'mysql', 'mongodb']);

let cachedBunModule: typeof import('bun') | null = null;

const loadBunModule = async () => {
  if (cachedBunModule === null) {
    cachedBunModule = await import('bun');
  }

  return cachedBunModule;
};

const runCommand = async (
  command: string[],
  options: CommandOptions = {}
) => {
  const bunModule = await loadBunModule();
  const processHandle = bunModule.spawn({
    cmd: command,
    env: options.env,
    stderr: options.stderr ?? 'inherit',
    stdin: options.stdin ?? 'inherit',
    stdout: options.stdout ?? 'inherit'
  });

  await processHandle.exited;

  return { exitCode: processHandle.exitCode ?? 0 };
};

const printHelp = () => {
  console.log(`Usage: bun run test:cli [options]

Run AbsoluteJS validation suites from a single command.

Examples:
  bun run test:cli --suite functional
  bun run test:cli --framework react --database sqlite
  bun run test:cli --all

Options:
  -h, --help              Show this help text and exit
      --list              List available suites and exit
      --suite <name>      Select suites to run (repeatable, comma-separated)
      --framework <name>  Filter or add framework suites (react, vue, svelte, html, htmx)
      --database <name>   Filter or add database suites (sqlite, postgresql, mysql, mongodb)
      --auth              Include the absoluteAuth suite
      --cloud             Include cloud provider suites
      --provider <name>   Filter cloud providers (neon, turso). Implies --cloud
      --all               Run every available suite
      --clean             Run cleanup tasks and exit
      --ci                Optimise output for CI environments
      --dry-run           Print the commands that would be executed, then exit

Notes:
   · Framework and database filters auto-include their corresponding suites.
   · When combined with --suite, filters apply only to matching suite types.
`);
};

const printSuites = () => {
  console.log('Available suites:\n');

  SUITE_DEFINITIONS.forEach((suite) => {
    const extras: string[] = [];

    if (suite.frameworks) {
      extras.push(`frameworks: ${suite.frameworks.join(', ')}`);
    }

    if (suite.databases) {
      extras.push(`databases: ${suite.databases.join(', ')}`);
    }

    if (suite.providers) {
      extras.push(`providers: ${suite.providers.join(', ')}`);
    }

    const suffix = extras.length > 0 ? ` (${extras.join('; ')})` : '';
    console.log(`- ${suite.name}: ${suite.label}${suffix}\n    ${suite.description}`);
  });
};

const collectListValues = (
  argv: string[],
  currentIndex: number,
  flag: string
) => {
  const value = argv[currentIndex + 1];

  if (!value) {
    throw new Error(`${flag} requires a value`);
  }

  const values = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return { nextIndex: currentIndex + 1, values };
};

const applyListOption = (
  argv: string[],
  currentIndex: number,
  flag: string,
  target: string[],
  afterApply?: () => void
) => {
  const { nextIndex, values } = collectListValues(argv, currentIndex, flag);
  target.push(...values);

  if (afterApply) {
    afterApply();
  }

  return nextIndex;
};

export const parseArgs = (argv: string[]) => {
  const options: CliOptions = {
    all: false,
    ciMode: false,
    clean: false,
    databaseFilters: [],
    dryRun: false,
    frameworkFilters: [],
    help: false,
    includeAuth: false,
    includeCloud: false,
    list: false,
    providers: [],
    suites: []
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    switch (arg) {
      case '-h':
      case '--help':
        options.help = true;
        break;
      case '--list':
        options.list = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--clean':
        options.clean = true;
        break;
      case '--ci':
        options.ciMode = true;
        break;
      case '--all':
        options.all = true;
        break;
      case '--auth':
        options.includeAuth = true;
        break;
      case '--cloud':
        options.includeCloud = true;
        break;
      case '--suite':
        index = applyListOption(argv, index, '--suite', options.suites);
        break;
      case '--framework':
        index = applyListOption(argv, index, '--framework', options.frameworkFilters);
        break;
      case '--database':
        index = applyListOption(argv, index, '--database', options.databaseFilters);
        break;
      case '--provider':
        index = applyListOption(argv, index, '--provider', options.providers, () => {
          options.includeCloud = true;
        });
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  return options;
};

const normaliseValue = (value: string) => value.toLowerCase();

const shouldIncludeSuite = (
  suite: SuiteDefinition,
  frameworkFilterSet: Set<string>,
  databaseFilterSet: Set<string>
) => {
  if (!suite) {
    return false;
  }

  if (suite.group === 'framework' && frameworkFilterSet.size > 0) {
    return suite.frameworks?.some((framework) => frameworkFilterSet.has(normaliseValue(framework))) ?? false;
  }

  if (suite.group === 'database' && databaseFilterSet.size > 0) {
    return suite.databases?.some((database) => databaseFilterSet.has(normaliseValue(database))) ?? false;
  }

  return true;
};

export const buildSuiteQueue = (options: CliOptions) => {
  const orderedSuites: string[] = [];
  const seen = new Set<string>();

  const addSuite = (candidate: string) => {
    const name = normaliseValue(candidate);

    if (!SUITE_MAP.has(name)) {
      throw new Error(`Unknown suite: ${candidate}`);
    }

    if (!seen.has(name)) {
      orderedSuites.push(name);
      seen.add(name);
    }
  };

  if (options.all) {
    SUITE_DEFINITIONS.forEach((suite) => addSuite(suite.name));
  }

  options.suites.forEach(addSuite);

  options.frameworkFilters.forEach((framework) => {
    const name = normaliseValue(framework);

    if (!VALID_FRAMEWORKS.has(name)) {
      throw new Error(`Unknown framework: ${framework}`);
    }

    const suite = SUITE_DEFINITIONS.find(
      (definition) => definition.group === 'framework' && definition.frameworks?.includes(name)
    );

    if (suite) {
      addSuite(suite.name);
    }
  });

  options.databaseFilters.forEach((database) => {
    const name = normaliseValue(database);

    if (!VALID_DATABASES.has(name)) {
      throw new Error(`Unknown database: ${database}`);
    }

    const suite = SUITE_DEFINITIONS.find(
      (definition) => definition.group === 'database' && definition.databases?.includes(name)
    );

    if (suite) {
      addSuite(suite.name);
    }
  });

  if (options.includeAuth) {
    addSuite('auth');
  }

  if (options.includeCloud) {
    addSuite('cloud');
  }

  if (!options.all && orderedSuites.length === 0) {
    addSuite('functional');
  }

  const frameworkFilterSet = new Set(options.frameworkFilters.map(normaliseValue));
  const databaseFilterSet = new Set(options.databaseFilters.map(normaliseValue));

  return orderedSuites.filter((suiteName) => {
    const suite = SUITE_MAP.get(suiteName);

    return shouldIncludeSuite(suite, frameworkFilterSet, databaseFilterSet);
  });
};

const removePath = (targetPath: string) => {
  if (existsSync(targetPath)) {
    rmSync(targetPath, { force: true, recursive: true });
  }
};

const runCleanup = () => {
  console.log('Cleaning generated projects and dependency cache...');
  cleanupProjectDirectory('absolutejs-project');
  removePath('.test-dependency-cache');
  cleanupCache();
  console.log('Cleanup complete.');
};

const formatDryRunCommand = (suite: SuiteDefinition, providerEnv?: string) => {
  const args = suite.args?.length ? ` ${suite.args.join(' ')}` : '';
  const envNote = suite.name === 'cloud' && providerEnv ? ` (ABSOLUTE_CLOUD_PROVIDERS=${providerEnv})` : '';

  return `• bun run ${suite.script}${args}${envNote}`;
};

const printDryRun = (suiteNames: string[], providerEnv?: string) => {
  console.log('Dry run — commands to execute:\n');
  suiteNames
    .map((name) => SUITE_MAP.get(name))
    .filter((suite): suite is SuiteDefinition => Boolean(suite))
    .forEach((suite) => console.log(formatDryRunCommand(suite, providerEnv)));
  console.log('\nNo commands were executed.');
};

export const runSuites = async (suiteNames: string[], options: CliOptions) => {
  if (suiteNames.length === 0) {
    console.log('No suites selected; nothing to run.');

    return 0;
  }

  const providerFilter = options.providers.map(normaliseValue);
  const providerEnv = providerFilter.length > 0 ? providerFilter.join(',') : undefined;

  if (options.dryRun) {
    printDryRun(suiteNames, providerEnv);

    return 0;
  }

  const results: SuiteExecution[] = [];
  let overallExitCode = 0;
  const suiteCount = suiteNames.length;

  await suiteNames.reduce(async (chain, suiteName, index) => {
    await chain;
    const result = await executeSuite(suiteName, index, suiteCount, options, providerEnv);
    results.push(result);
    overallExitCode = result.exitCode !== 0 ? result.exitCode : overallExitCode;
  }, Promise.resolve());

  const passedCount = results.filter((result) => result.exitCode === 0).length;
  const failedCount = results.length - passedCount;

  console.log('\n=== Summary ===\n');
  results.forEach((result) => {
    const status = result.exitCode === 0 ? 'passed' : `failed (exit ${result.exitCode})`;
    console.log(`• ${result.label} – ${status} (${result.duration}ms)`);
  });
  console.log(`\nTotal suites: ${results.length}`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${failedCount}`);

  return overallExitCode;
};

const executeSuite = async (
  suiteName: string,
  index: number,
  total: number,
  options: CliOptions,
  providerEnv?: string
) => {
  const suite = SUITE_MAP.get(suiteName);

  if (!suite) {
    throw new Error(`Unknown suite: ${suiteName}`);
  }

  console.log(`[${index + 1}/${total}] Running ${suite.label} (${suite.name})`);
  const start = Date.now();
  const env: Record<string, string> = { ...process.env } as Record<string, string>;

  if (options.ciMode) {
    env.CI = env.CI ?? '1';
    env.ABSOLUTE_TEST_CI = '1';
  }

  if (suite.name === 'cloud' && providerEnv) {
    env.ABSOLUTE_CLOUD_PROVIDERS = providerEnv;
  }

  const commandResult = await runCommand(
    ['bun', 'run', suite.script, ...(suite.args ?? [])],
    { env }
  );
  const duration = Date.now() - start;

  if (commandResult.exitCode === 0) {
    console.log(`✓ ${suite.label} passed (${duration}ms)`);
  } else {
    console.log(`✗ ${suite.label} failed (exit code ${commandResult.exitCode}, ${duration}ms)`);
  }

  return {
    duration,
    exitCode: commandResult.exitCode,
    label: suite.label,
    name: suite.name
  } satisfies SuiteExecution;
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();

    return;
  }

  if (options.list) {
    printSuites();

    return;
  }

  if (options.clean) {
    runCleanup();

    return;
  }

  const suiteQueue = buildSuiteQueue(options);
  const exitCode = await runSuites(suiteQueue, options);
  process.exit(exitCode);
};

if (import.meta.main) {
  main().catch((error) => {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  });
}