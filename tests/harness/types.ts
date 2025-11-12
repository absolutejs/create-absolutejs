export type Frontend =
  | 'none'
  | 'react'
  | 'vue'
  | 'svelte'
  | 'html'
  | 'htmx';

export type DatabaseEngine = 'none' | 'sqlite' | 'postgresql' | 'mysql' | 'mongodb';

export type DatabaseHost = 'none' | 'local' | 'turso' | 'neon' | 'planetscale';

export type AuthProvider = 'none' | 'absoluteAuth';

export type Orm = 'none' | 'drizzle';

export type CodeQualityTool = 'none' | 'eslint+prettier';

export type DirectoryConfiguration = 'default' | 'custom';

export interface ScaffoldOptions {
  projectName?: string;
  frontend?: Frontend;
  database?: DatabaseEngine;
  databaseHost?: DatabaseHost;
  auth?: AuthProvider;
  orm?: Orm;
  useTailwind?: boolean;
  codeQuality?: CodeQualityTool;
  directory?: DirectoryConfiguration;
  packageManager?: 'bun' | 'npm' | 'pnpm' | 'yarn';
  env?: Record<string, string | undefined>;
}

export interface ScaffoldResult {
  projectName: string;
  projectPath: string;
}

export interface RunCommandOptions {
  cwd?: string;
  env?: Record<string, string | undefined>;
  timeoutMs?: number;
  label?: string;
}

export interface RunCommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

export interface StartServerOptions {
  env?: Record<string, string | undefined>;
  readyUrl?: string;
  readyTimeoutMs?: number;
  forwardStdout?: boolean;
  forwardStderr?: boolean;
  command?: string[];
}

export interface RunningServer {
  stop: () => Promise<void>;
  url: string;
}

