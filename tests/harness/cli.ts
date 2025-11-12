import { ScaffoldOptions } from './types';

const FRONTEND_FLAGS: Record<string, string> = {
  html: '--html',
  htmx: '--htmx',
  react: '--react',
  svelte: '--svelte',
  vue: '--vue'
};

export const buildScaffoldArguments = (
  projectName: string,
  options: ScaffoldOptions
) => {
  const args: string[] = [projectName, '--skip'];

  const frontendFlag =
    options.frontend && options.frontend !== 'none'
      ? FRONTEND_FLAGS[options.frontend]
      : undefined;

  if (frontendFlag) {
    args.push(frontendFlag);
  }

  if (options.useTailwind) {
    args.push('--tailwind');
  }

  if (options.codeQuality === 'eslint+prettier') {
    args.push('--eslint+prettier');
  }

  if (options.database && options.database !== 'none') {
    args.push('--db', options.database);
  }

  if (options.databaseHost && options.databaseHost !== 'none') {
    args.push('--db-host', options.databaseHost);
  }

  if (options.orm && options.orm !== 'none') {
    args.push('--orm', options.orm);
  }

  if (options.auth && options.auth !== 'none') {
    args.push('--auth', options.auth);
  }

  if (options.directory === 'custom') {
    args.push('--directory', 'custom');
  }

  if (options.packageManager && options.packageManager !== 'bun') {
    args.push('--package-manager', options.packageManager);
  }

  return args;
};

