import { join } from 'node:path';
import process from 'node:process';

import { removeDirectoryIfExists } from './filesystem';
import { minutesToMilliseconds, MILLISECONDS_PER_SECOND } from './timing';
import { createFailure, createSuccess, type StepResult } from './types';

const DEFAULT_TIMEOUT_MS = minutesToMilliseconds(2);

const FRAMEWORK_FLAGS: Record<string, string> = {
  html: '--html',
  htmx: '--htmx',
  react: '--react',
  svelte: '--svelte',
  vue: '--vue'
};

export type ScaffoldOptions = {
  readonly projectName: string;
  readonly framework?: string;
  readonly databaseEngine?: string;
  readonly databaseHost?: string;
  readonly orm?: string;
  readonly authProvider?: string;
  readonly codeQualityTool?: string;
  readonly directoryConfig?: string;
  readonly useTailwind?: boolean;
  readonly skipPrompts?: boolean;
  readonly extraArgs?: readonly string[];
  readonly cwd?: string;
  readonly env?: Record<string, string | undefined>;
  readonly timeoutMs?: number;
};

export type ScaffoldResult = StepResult & {
  readonly projectName: string;
  readonly projectPath: string;
  readonly exitCode?: number;
  readonly timedOut?: boolean;
};

const buildCommand = (options: ScaffoldOptions) => {
  const args: string[] = ['bun', 'run', 'src/index.ts', options.projectName];

  if (options.skipPrompts !== false) {
    args.push('--skip');
  }

  if (options.framework) {
    const flag = FRAMEWORK_FLAGS[options.framework] ?? `--${options.framework}`;
    args.push(flag);
  }

  if (options.databaseEngine && options.databaseEngine !== 'none') {
    args.push('--db', options.databaseEngine);
  }

  if (options.orm && options.orm !== 'none') {
    args.push('--orm', options.orm);
  }

  if (options.databaseHost && options.databaseHost !== 'none') {
    args.push('--db-host', options.databaseHost);
  }

  if (options.authProvider && options.authProvider !== 'none') {
    args.push('--auth', options.authProvider);
  }

  if (options.codeQualityTool && options.codeQualityTool !== 'none') {
    args.push(`--${options.codeQualityTool}`);
  }

  if (options.useTailwind) {
    args.push('--tailwind');
  }

  if (options.directoryConfig === 'custom') {
    args.push('--directory', 'custom');
  }

  if (options.extraArgs) {
    args.push(...options.extraArgs);
  }

  return args;
};

let cachedBunModule: typeof import('bun') | null = null;

const loadBun = async () => {
  if (!cachedBunModule) {
    cachedBunModule = await import('bun');
  }

  return cachedBunModule;
};

export const scaffoldProject = async (options: ScaffoldOptions): Promise<ScaffoldResult> => {
  const cwd = options.cwd ?? process.cwd();
  const projectPath = join(cwd, options.projectName);
  const command = buildCommand(options);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  removeDirectoryIfExists(projectPath);

  process.stdout.write('  → Scaffolding project... ');

  const start = Date.now();

  const bun = await loadBun();

  const subprocess = bun.spawn({
    cmd: command,
    cwd,
    env: {
      ...process.env,
      ...(options.env ?? {})
    },
    stderr: 'pipe',
    stdin: 'inherit',
    stdout: 'pipe'
  });

  const collectStream = async (stream?: ReadableStream<Uint8Array>) => {
    if (!stream) {
      return '';
    }

    const decoder = new TextDecoder();
    const chunks = await bun.readableStreamToArray(stream);

    return chunks.map((chunk) => decoder.decode(chunk)).join('');
  };

  const stdoutPromise = collectStream(subprocess.stdout);
  const stderrPromise = collectStream(subprocess.stderr);

  let timedOut = false;

  const timeoutId = setTimeout(() => {
    timedOut = true;
    try {
      subprocess.kill();
    } catch {
      // Ignore kill errors.
    }
  }, timeoutMs);

  const exitCode = await subprocess.exited.then(() => subprocess.exitCode ?? 0).catch(() => null);
  const [capturedStdout, capturedStderr] = await Promise.all([stdoutPromise, stderrPromise]);

  clearTimeout(timeoutId);

  const elapsedMs = Date.now() - start;

  const debugOutput =
    process.env.ABSOLUTE_TEST_VERBOSE === '1' || process.env.ABSOLUTE_TEST_DEBUG === '1';

  const printCapturedOutput = (label: string, output: string) => {
    const trimmed = output.trim();

    if (trimmed.length === 0) {
      return;
    }

    console.log(`\n${label}:\n${trimmed}\n`);
  };

  if (timedOut) {
    const elapsedSeconds = (elapsedMs / MILLISECONDS_PER_SECOND).toFixed(1);
    console.log(`✗ (TIMEOUT after ${elapsedSeconds}s)`);
    printCapturedOutput('Scaffold stdout', capturedStdout);
    printCapturedOutput('Scaffold stderr', capturedStderr);

    return {
      ...createFailure([`Scaffold timed out after ${elapsedSeconds}s`], elapsedMs),
      exitCode: null,
      projectName: options.projectName,
      projectPath,
      timedOut: true
    };
  }

  if (exitCode !== 0) {
    console.log(`✗ (${elapsedMs}ms)`);
    printCapturedOutput('Scaffold stdout', capturedStdout);
    printCapturedOutput('Scaffold stderr', capturedStderr);

    return {
      ...createFailure([`Scaffold failed with exit code ${exitCode ?? 'unknown'}`], elapsedMs),
      exitCode: exitCode ?? undefined,
      projectName: options.projectName,
      projectPath
    };
  }

  if (debugOutput) {
    printCapturedOutput('Scaffold stdout', capturedStdout);
    printCapturedOutput('Scaffold stderr', capturedStderr);
  }

  console.log(`✓ (${elapsedMs}ms)`);

  return {
    ...createSuccess(elapsedMs),
    exitCode: 0,
    projectName: options.projectName,
    projectPath
  };
};

export const cleanupProject = (projectName: string, cwd = process.cwd()) => {
  removeDirectoryIfExists(join(cwd, projectName));
};

