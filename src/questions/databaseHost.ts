import { select, isCancel, confirm } from '@clack/prompts';
import { cyan } from 'picocolors';
import type { DatabaseEngine } from '../types';
import { abort } from '../utils/abort';

export const getDatabaseHost = async (databaseEngine: DatabaseEngine) => {
	if (databaseEngine === 'postgresql') {
		const databaseHost = await select({
			message: 'Select database host:',
			options: [
				{ label: cyan('Neon'), value: 'neon' },
				{ label: cyan('Supabase'), value: 'supabase' },
				{ label: 'None', value: 'none' }
			]
		});
		if (isCancel(databaseHost)) abort();

		return databaseHost === 'none' ? undefined : databaseHost;
	}

	if (databaseEngine === 'mysql') {
		const databaseHost = await confirm({
			message: 'Are you using PlanetScale?'
		});
		if (isCancel(databaseHost)) abort();

		return databaseHost ? 'planetscale' : undefined;
	}

	if (databaseEngine === 'sqlite') {
		const databaseHost = await confirm({
			message: 'Are you using Turso?'
		});
		if (isCancel(databaseHost)) abort();

		return databaseHost ? 'turso' : undefined;
	}

	if (databaseEngine === 'mongodb') {
		const databaseHost = await confirm({
			message: 'Are you using Atlas?'
		});
		if (isCancel(databaseHost)) abort();

		return databaseHost ? 'atlas' : undefined;
	}

	if (databaseEngine === 'redis') {
		const databaseHost = await confirm({
			message: 'Are you using Upstash?'
		});
		if (isCancel(databaseHost)) abort();

		return databaseHost ? 'upstash' : undefined;
	}

	return undefined;
};
