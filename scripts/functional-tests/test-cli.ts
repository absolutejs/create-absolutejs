import { existsSync, rmSync } from 'node:fs';
import process from 'node:process';
import { cleanupCache } from './dependency-cache';
import {
  KNOWN_DATABASES,
  KNOWN_FRAMEWORKS,
  KNOWN_PROVIDERS,
  SUITE_MAP,
  SUITE_REGISTRY,
  type SuiteDefinition
} from './test-cli-registry';
import { cleanupProjectDirectory } from './test-utils';

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
  runBehavioural: boolean;
  runFunctional: boolean;
  suites: string[];
};

type CommandOptions = {
  env?: Record<string, string>;
  stderr?: 'inherit' | 'pipe';
  stdin?: 'inherit' | 'ignore';
  stdout?: 'inherit' | 'pipe';
};

type SuiteRunMode = 'functional' | 'behavioural';

type SuiteExecutionPlan = {
  mode: SuiteRunMode;
  skipReason?: string;
  suite: SuiteDefinition;
};

type SuiteExecution = {
  duration: number;
  exitCode: number;
  label: string;
  mode: SuiteRunMode;
  name: string;
  skipReason?: string;
  skipped: boolean;
};

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
  --behavioural       Run behavioural specs for selected suites (disables functional unless --functional is also set)
  --functional        Run functional harnesses (default behaviour)
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

  SUITE_REGISTRY.forEach((suite) => {
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
    runBehavioural: false,
    runFunctional: true,
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
      case '--behavioural':
        options.runBehavioural = true;
        options.runFunctional = false;
        break;
      case '--functional':
        options.runFunctional = true;
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

  options.providers.forEach((provider) => {
    const normalisedProvider = provider.toLowerCase();

    if (!KNOWN_PROVIDERS.has(normalisedProvider)) {
      throw new Error(`Unknown provider: ${provider}`);
    }
  });

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
    SUITE_REGISTRY.forEach((suite) => addSuite(suite.name));
  }

  options.suites.forEach(addSuite);

  options.frameworkFilters.forEach((framework) => {
    const name = normaliseValue(framework);

    if (!KNOWN_FRAMEWORKS.has(name)) {
      throw new Error(`Unknown framework: ${framework}`);
    }

    const suite = SUITE_REGISTRY.find(
      (definition) => definition.group === 'framework' && definition.frameworks?.includes(name)
    );

    if (suite) {
      addSuite(suite.name);
    }
  });

  options.databaseFilters.forEach((database) => {
    const name = normaliseValue(database);

    if (!KNOWN_DATABASES.has(name)) {
      throw new Error(`Unknown database: ${database}`);
    }

    const suite = SUITE_REGISTRY.find(
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

  if (!options.all && orderedSuites.length === 0 && options.runFunctional) {
    addSuite('functional');
  }

  const frameworkFilterSet = new Set(options.frameworkFilters.map(normaliseValue));
  const databaseFilterSet = new Set(options.databaseFilters.map(normaliseValue));

  return orderedSuites.filter((suiteName) => {
    const suite = SUITE_MAP.get(suiteName);

    return shouldIncludeSuite(suite, frameworkFilterSet, databaseFilterSet);
  });
};

const buildExecutionPlan = (suiteNames: string[], options: CliOptions) =>
  suiteNames.flatMap((suiteName) => {
    const suite = SUITE_MAP.get(suiteName);

    if (!suite) {
      return [];
    }

    const runs: SuiteExecutionPlan[] = [];

    if (options.runFunctional) {
      runs.push({ mode: 'functional', suite });
    }

    if (options.runBehavioural) {
      const { behavioural } = suite.runners;
      runs.push(
        behavioural
          ? { mode: 'behavioural', suite }
          : {
              mode: 'behavioural',
              skipReason: 'Behavioural runner not defined for this suite.',
              suite
            }
      );
    }

    return runs;
  });

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

const formatRunLabel = (suite: SuiteDefinition, mode: SuiteRunMode) =>
  `${suite.label} [${mode}]`;

const formatDryRunCommand = (plan: SuiteExecutionPlan, providerEnv?: string) => {
  const label = formatRunLabel(plan.suite, plan.mode);

  if (plan.skipReason) {
    return `• (skip) ${label} – ${plan.skipReason}`;
  }

  if (plan.mode === 'functional') {
    const args = plan.suite.runners.functional.args?.length
      ? ` ${plan.suite.runners.functional.args.join(' ')}`
      : '';
    const runnerType = plan.suite.runners.functional.runnerType ?? 'bun-run';
    const envNote =
      plan.suite.name === 'cloud' && providerEnv
        ? ` (ABSOLUTE_CLOUD_PROVIDERS=${providerEnv})`
        : '';

    const commandPrefix = runnerType === 'bun-test' ? 'bun test' : 'bun run';

    return `• ${commandPrefix} ${plan.suite.runners.functional.script}${args}${envNote}`;
  }

  const { behavioural } = plan.suite.runners;
  if (!behavioural || behavioural.testFiles.length === 0) {
    return `• (skip) ${label} – behavioural runner not configured`;
  }

  const { testFiles } = behavioural;
  const files = testFiles.join(' ');
  const envNote =
    plan.suite.name === 'cloud' && providerEnv
      ? ` (ABSOLUTE_CLOUD_PROVIDERS=${providerEnv})`
      : '';

  return `• bun test ${files}${envNote}`;
};

const printDryRun = (plan: SuiteExecutionPlan[], providerEnv?: string) => {
  console.log('Dry run — commands to execute:\n');
  plan.forEach((planItem) => console.log(formatDryRunCommand(planItem, providerEnv)));
  console.log('\nNo commands were executed.');
};

export const runSuites = async (suiteNames: string[], options: CliOptions) => {
  const executionPlan = buildExecutionPlan(suiteNames, options);
  if (executionPlan.length === 0) {
    console.log('No suite runs selected; nothing to run.');

    return 0;
  }

  const planCount = executionPlan.length;
  const providerFilter = options.providers.map(normaliseValue);
  const providerEnv = providerFilter.length > 0 ? providerFilter.join(',') : undefined;

  if (options.dryRun) {
    printDryRun(executionPlan, providerEnv);

    return 0;
  }

  const results: SuiteExecution[] = [];
  let overallExitCode = 0;
  await executionPlan.reduce(async (chain, planItem, index) => {
    await chain;
    const result = await executeSuitePlan(planItem, index, planCount, options, providerEnv);
    results.push(result);
    overallExitCode =
      !result.skipped && result.exitCode !== 0 ? result.exitCode : overallExitCode;
  }, Promise.resolve());

  const passedCount = results.filter((result) => !result.skipped && result.exitCode === 0).length;
  const skippedCount = results.filter((result) => result.skipped).length;
  const failedCount = results.length - passedCount - skippedCount;

  console.log('\n=== Summary ===\n');
  results.forEach((result) => {
    if (result.skipped) {
      console.log(
        `⚠ ${result.label} – skipped${result.skipReason ? ` (${result.skipReason})` : ''}`
      );
    } else {
      const status = result.exitCode === 0 ? 'passed' : `failed (exit ${result.exitCode})`;
      console.log(`• ${result.label} – ${status} (${result.duration}ms)`);
    }
  });
  console.log(`\nTotal suites: ${results.length}`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log(`Skipped: ${skippedCount}`);

  return overallExitCode;
};

const executeSuitePlan = async (
  plan: SuiteExecutionPlan,
  index: number,
  total: number,
  options: CliOptions,
  providerEnv?: string
): Promise<SuiteExecution> => {
  const { suite, mode } = plan;
  const label = formatRunLabel(suite, mode);
  const ordinal = `[${index + 1}/${total}]`;

  if (plan.skipReason) {
    console.log(`${ordinal} ⚠ Skipping ${suite.label} (${suite.name}) [${mode}] – ${plan.skipReason}`);

    return {
      duration: 0,
      exitCode: 0,
      label,
      mode,
      name: suite.name,
      skipped: true,
      skipReason: plan.skipReason
    };
  }

  const behaviouralRunner = suite.runners.behavioural;

  if (mode === 'behavioural' && (!behaviouralRunner || behaviouralRunner.testFiles.length === 0)) {
    const reason = 'Behavioural runner configuration missing.';
    console.log(`${ordinal} ⚠ Skipping ${suite.label} (${suite.name}) [behavioural] – ${reason}`);

    return {
      duration: 0,
      exitCode: 0,
      label,
      mode,
      name: suite.name,
      skipped: true,
      skipReason: reason
    };
  }

  console.log(`${ordinal} Running ${suite.label} (${suite.name}) [${mode}]`);
  const start = Date.now();
  const env: Record<string, string> = { ...process.env } as Record<string, string>;

  if (options.ciMode) {
    env.CI = env.CI ?? '1';
    env.ABSOLUTE_TEST_CI = '1';
  }

  if (suite.name === 'cloud' && providerEnv) {
    env.ABSOLUTE_CLOUD_PROVIDERS = providerEnv;
  }

  if (plan.mode === 'behavioural' && suite.group === 'database') {
    env.ABSOLUTE_BEHAVIOURAL_DATABASE_FILTER = suite.name.toLowerCase();
  }

  let command: string[];

  if (mode !== 'functional') {
    env.ABSOLUTE_BEHAVIOURAL_MODE = '1';
    const { testFiles } = behaviouralRunner!;
    command = ['bun', 'test', ...testFiles];
  } else {
    env.ABSOLUTE_BEHAVIOURAL_MODE = env.ABSOLUTE_BEHAVIOURAL_MODE ?? '0';
    const runnerType = suite.runners.functional.runnerType ?? 'bun-run';
    command =
      runnerType === 'bun-test'
        ? ['bun', 'test', suite.runners.functional.script, ...(suite.runners.functional.args ?? [])]
        : ['bun', 'run', suite.runners.functional.script, ...(suite.runners.functional.args ?? [])];
  }

  const commandResult = await runCommand(command, { env });
  const duration = Date.now() - start;

  if (commandResult.exitCode === 0) {
    console.log(`✓ ${label} passed (${duration}ms)`);
  } else {
    console.log(`✗ ${label} failed (exit code ${commandResult.exitCode}, ${duration}ms)`);
  }

  return {
    duration,
    exitCode: commandResult.exitCode,
    label,
    mode,
    name: suite.name,
    skipped: false
  };
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