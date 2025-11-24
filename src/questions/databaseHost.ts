import { select, isCancel } from '@clack/prompts';
import { cyan } from 'picocolors';
import type { DatabaseEngine } from '../types';
import { abort } from '../utils/abort';

export const getDatabaseHost = async (databaseEngine: DatabaseEngine) => {
	if (databaseEngine === 'postgresql') {
		const databaseHost = await select({
			message: 'Select database host:',
			options: [
				{ label: 'None', value: 'none' },
				{ label: cyan('Neon'), value: 'neon' }
			]
		});
		if (isCancel(databaseHost)) abort();

		return databaseHost === 'none' ? undefined : databaseHost;
	}

	if (databaseEngine === 'mysql') {
		const databaseHost = await select({
			message: 'Select database host:',
			options: [
				{ label: 'None', value: 'none' },
				{ label: cyan('PlanetScale'), value: 'planetscale' }
			]
		});
		if (isCancel(databaseHost)) abort();

		return databaseHost === 'none' ? undefined : databaseHost;
	}

	if (databaseEngine === 'sqlite') {
		const databaseHost = await select({
			message: 'Select database host:',
			options: [
				{ label: 'None', value: 'none' },
				{ label: cyan('Turso'), value: 'turso' }
			]
		});
		if (isCancel(databaseHost)) abort();

		return databaseHost === 'none' ? undefined : databaseHost;
	}

	return undefined;
};
