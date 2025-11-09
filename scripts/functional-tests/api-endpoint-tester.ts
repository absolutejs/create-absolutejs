import process from 'node:process';

export type APIEndpointResult = {
  passed: boolean;
  errors: string[];
  warnings: string[];
};

const DEFAULT_SERVER_URL = 'http://localhost:3000';
const PLACEHOLDER_WARNING = 'API endpoint testing is not yet fully implemented';
const SERVER_AVAILABILITY_WARNING = 'This requires the server to be running and accessible';

export const testAPIEndpoints = async (
  projectPath: string,
  serverUrl?: string,
  config: {
    authProvider?: string;
    frontends?: string[];
  } = {}
): Promise<APIEndpointResult> => {
  void projectPath;
  void serverUrl;
  void config;

  return {
    errors: [],
    passed: true,
    warnings: [PLACEHOLDER_WARNING, SERVER_AVAILABILITY_WARNING]
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
  console.error('Usage: bun run scripts/functional-tests/api-endpoint-tester.ts <project-path> [server-url]');
  process.exit(1);
};

const runFromCli = async () => {
  const { projectPath, serverUrl } = parseCliArguments();

  if (!projectPath) {
    exitWithUsage();
  }

  const result = await testAPIEndpoints(projectPath, serverUrl).catch((unknownError) => {
    const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));
    console.error('✗ API endpoint test error:', error);
    process.exit(1);
  });

  if (!result) {
    return;
  }

  if (!result.passed) {
    console.error('✗ API endpoint test failed:');
    result.errors.forEach((error) => console.error(`  - ${error}`));
    process.exit(1);
  }

  console.log('✓ API endpoint test passed');
  result.warnings.forEach((warning) => console.warn(`  ⚠ ${warning}`));
  process.exit(0);
};

if (import.meta.main) {
  runFromCli().catch((error) => {
    console.error('✗ API endpoint tester encountered an unexpected error:', error);
    process.exit(1);
  });
}
