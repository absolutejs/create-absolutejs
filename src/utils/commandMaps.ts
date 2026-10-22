import { PackageManager } from '../types';

export const formatCommands: Record<PackageManager, string> = {
	bun: 'bun run format',
	npm: 'npm run format',
	pnpm: 'pnpm run format',
	yarn: 'yarn format'
};

export const installCommands: Record<PackageManager, string> = {
	bun: 'bun install',
	npm: 'npm install',
	pnpm: 'pnpm install',
	yarn: 'yarn install'
};
