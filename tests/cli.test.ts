import { argv } from 'process';
import { afterEach, describe, expect, test } from 'bun:test';
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

describe('plugins', () => {
	test('--plugin=elysia-rate-limit still picks the rate limiter, now @absolutejs/rate-limit', () => {
		argv.splice(
			0,
			argv.length,
			'bun',
			'create-absolutejs',
			'saas-app',
			'--skip',
			'--plugin=elysia-rate-limit',
			'--plugin=@elysia/cors'
		);

		const { argumentConfiguration } = parseCommandLineOptions();

		expect(argumentConfiguration.plugins).toEqual([
			'@absolutejs/rate-limit',
			'@elysia/cors'
		]);
	});
});

describe('frontend flags', () => {
	test('--angular and --angular-dir select Angular like the other frameworks', () => {
		argv.splice(
			0,
			argv.length,
			'bun',
			'create-absolutejs',
			'ng-app',
			'--skip',
			'--angular',
			'--angular-dir=client/ng',
			'--html'
		);

		const { argumentConfiguration } = parseCommandLineOptions();

		expect(argumentConfiguration.frontends).toEqual(['angular', 'html']);
		expect(argumentConfiguration.frontendDirectories?.angular).toBe(
			'client/ng'
		);
	});

	test('--skip defaults HTML scripts on, and --no-html-scripts still wins', () => {
		argv.splice(0, argv.length, 'bun', 'create-absolutejs', 'a', '--skip');
		expect(
			parseCommandLineOptions().argumentConfiguration.useHTMLScripts
		).toBe(true);

		argv.splice(
			0,
			argv.length,
			'bun',
			'create-absolutejs',
			'a',
			'--skip',
			'--no-html-scripts'
		);
		expect(
			parseCommandLineOptions().argumentConfiguration.useHTMLScripts
		).toBe(false);
	});
});
