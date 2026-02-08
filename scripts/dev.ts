import { existsSync, readFileSync, rmSync } from 'fs';
import { delimiter } from 'path';
import { platform } from 'process';
import { $ } from 'bun';

const projectDir = 'absolutejs-project';

const DOCKER_WIN_PATH = 'C:\\Program Files\\Docker\\Docker\\resources\\bin';

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

// Reset database if the scaffolded project has a db:reset script
if (existsSync(`${projectDir}/package.json`)) {
	const pkg = JSON.parse(readFileSync(`${projectDir}/package.json`, 'utf-8'));
	if (pkg.scripts?.['db:reset']) {
		const env = await getDbResetEnv();
		const res = await $`bun run db:reset`
			.cwd(projectDir)
			.env(env)
			.quiet()
			.nothrow();
		if (res.exitCode !== 0) {
			console.warn(
				`db:reset failed (exit ${res.exitCode}), continuing with re-scaffold…`
			);
		}
	}
}

// Remove existing project and re-scaffold
rmSync(projectDir, { recursive: true, force: true });

const proc = Bun.spawn(['bun', 'run', 'src/index.ts'], {
	stdio: ['inherit', 'inherit', 'inherit']
});
await proc.exited;
