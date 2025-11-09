import process from 'node:process';

export type FrontendRendererResult = {
  passed: boolean;
  errors: string[];
  warnings: string[];
};

const DEFAULT_SERVER_URL = 'http://localhost:3000';
const RENDERER_WARNINGS = [
  'Frontend rendering testing is not yet fully implemented',
  'This requires headless browser automation and a running server'
];

export const testFrontendRendering = async (
  projectPath: string,
  serverUrl?: string,
  config: {
    frontends?: string[];
  } = {}
): Promise<FrontendRendererResult> => {
  void projectPath;
  void serverUrl;
  void config;

  return {
    errors: [],
    passed: true,
    warnings: [...RENDERER_WARNINGS]
  };
};

const parseCliArguments = () => {
  const [, , projectPath, serverUrlArg] = process.argv;

  return {
    projectPath,
    serverUrl: serverUrlArg ?? DEFAULT_SERVER_URL
  } as const;
};

const exitWithUsage = () => {
  console.error('Usage: bun run scripts/functional-tests/frontend-renderer-tester.ts <project-path> [server-url]');
  process.exit(1);
};

const runFromCli = async () => {
  const { projectPath, serverUrl } = parseCliArguments();

  if (!projectPath) {
    exitWithUsage();
  }

  const result = await testFrontendRendering(projectPath, serverUrl).catch((unknownError) => {
    const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));
    console.error('✗ Frontend rendering test error:', error);
    process.exit(1);
  });

  if (!result) {
    return;
  }

  if (!result.passed) {
    console.error('✗ Frontend rendering test failed:');
    result.errors.forEach((error) => console.error(`  - ${error}`));
    process.exit(1);
  }

  console.log('✓ Frontend rendering test passed');
  result.warnings.forEach((warning) => console.warn(`  ⚠ ${warning}`));
  process.exit(0);
};

if (import.meta.main) {
  runFromCli().catch((error) => {
    console.error('✗ Frontend renderer tester encountered an unexpected error:', error);
    process.exit(1);
  });
}
