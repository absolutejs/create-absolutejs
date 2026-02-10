import { existsSync, readFileSync, rmSync } from 'fs';
import { delimiter } from 'path';
import { platform } from 'process';
import { $ } from 'bun';

import {
	ensureDockerDaemonRunning,
	hasDocker
} from '../src/utils/checkDockerInstalled';

const projectDir = 'absolutejs-project';

const DOCKER_WIN_PATH = 'C:\\Program Files\\Docker\\Docker\\resources\\bin';
const REMOVE_MAX_ATTEMPTS = 8;
const REMOVE_BASE_DELAY_MS = 1000;

const tryRemoveSync = (): boolean => {
	try {
		rmSync(projectDir, {
			force: true,
			maxRetries: 2,
			recursive: true,
			retryDelay: 500
		});

		return true;
	} catch (err: unknown) {
		const code = (err as NodeJS.ErrnoException).code;
		if (code !== 'EBUSY' && code !== 'EPERM') throw err;

		return false;
	}
};

const removeProjectDir = async () => {
	for (let attempt = 0; attempt < REMOVE_MAX_ATTEMPTS; attempt++) {
		if (tryRemoveSync()) return;
		console.warn(
			`Directory locked, retrying… (${attempt + 1}/${REMOVE_MAX_ATTEMPTS})`
		);
		await new Promise((resolve) =>
			setTimeout(resolve, REMOVE_BASE_DELAY_MS * (attempt + 1))
		);
	}
	throw new Error(
		`Could not remove ${projectDir} – a process may be locking it. Close any editors or terminals open in that directory.`
	);
};

const getDbResetEnv = async () => {
	if (platform !== 'win32') return process.env;
	const hasDocker = (await $`where docker`.quiet().nothrow()).exitCode === 0;
	if (hasDocker) return process.env;
	if (!existsSync(DOCKER_WIN_PATH)) return process.env;

	const pathJoin = process.env.PATH ?? '';

	return {
		...process.env,
		PATH: `${DOCKER_WIN_PATH}${pathJoin ? delimiter + pathJoin : ''}`
	};
};

const parseDbResetScript = (
	script: string
): { command: string; projectName: string | undefined } => {
	const projectMatch = script.match(/-p\s+(\S+)/);

	return { command: script, projectName: projectMatch?.[1] };
};

const cleanupDocker = async (env: Record<string, string | undefined>) => {
	const pkg = JSON.parse(readFileSync(`${projectDir}/package.json`, 'utf-8'));
	const dbResetScript = pkg.scripts?.['db:reset'] as string | undefined;
	if (!dbResetScript) return;
	if (!(await hasDocker())) return;

	try {
		await ensureDockerDaemonRunning();
	} catch {
		console.warn('Docker cleanup skipped (daemon unavailable)');

		return;
	}

	const { command, projectName } = parseDbResetScript(dbResetScript);
	const fullCommand = `${command} --remove-orphans`;

	const res = await $`${{ raw: fullCommand }}`
		.cwd(projectDir)
		.env(env)
		.quiet()
		.nothrow();

	if (res.exitCode === 0) return;

	if (projectName) {
		const fallback = `docker compose -p ${projectName} down -v --remove-orphans`;
		const fallbackRes = await $`${{ raw: fallback }}`
			.env(env)
			.quiet()
			.nothrow();

		if (fallbackRes.exitCode === 0) return;
	}

	console.warn('Docker cleanup failed, continuing with re-scaffold…');
};

// Reset database if the scaffolded project has a db:reset script
if (existsSync(`${projectDir}/package.json`)) {
	const env = await getDbResetEnv();
	await cleanupDocker(env);
}

// Remove existing project and re-scaffold
rmSync(projectDir, {
	force: true,
	maxRetries: 5,
	recursive: true,
	retryDelay: 500
});

const proc = Bun.spawn(['bun', 'run', 'src/index.ts'], {
	stdio: ['inherit', 'inherit', 'inherit']
});
await proc.exited;
