import { afterEach, describe, expect, test } from 'bun:test';
import { argv } from 'process';
import { parseCommandLineOptions } from '../src/utils/parseCommandLineOptions';

const originalArguments = [...argv];

afterEach(() => {
	argv.splice(0, argv.length, ...originalArguments);
});

describe('headless CLI defaults', () => {
	test('--skip resolves every prompted axis while preserving --agentic', () => {
		argv.splice(
			0,
			argv.length,
			'bun',
			'create-absolutejs',
			'agent-app',
			'--skip',
			'--agentic'
		);

		const { argumentConfiguration } = parseCommandLineOptions();

		expect(argumentConfiguration.agentic).toBe(true);
		expect(argumentConfiguration.frontends).toEqual([]);
		expect(argumentConfiguration.useTailwind).toBe(false);
		expect(argumentConfiguration.initializeGitNow).toBe(false);
		expect(argumentConfiguration.installDependenciesNow).toBe(false);
	});
});
