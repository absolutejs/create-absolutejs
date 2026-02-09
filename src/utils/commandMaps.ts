import { PackageManager } from '../types';

export const formatCommands: Record<PackageManager, string> = {
	bun: 'bun run format',
	npm: 'npm run format',
	pnpm: 'pnpm run format',
	yarn: 'yarn format'
};

export const formatNoInstallCommands: Record<PackageManager, string> = {
	bun: 'bunx prettier --write ./**/*.{js,ts,css,json,mjs,md,jsx,tsx,svelte,vue}',
	npm: 'npx prettier --write ./**/*.{js,ts,css,json,mjs,md,jsx,tsx,svelte,vue}',
	pnpm: 'pnpm dlx prettier --write ./**/*.{js,ts,css,json,mjs,md,jsx,tsx,svelte,vue}',
	yarn: 'yarn dlx prettier --write ./**/*.{js,ts,css,json,mjs,md,jsx,tsx,svelte,vue}'
};

export const installCommands: Record<PackageManager, string> = {
	bun: 'bun install',
	npm: 'npm install',
	pnpm: 'pnpm install',
	yarn: 'yarn install'
};
