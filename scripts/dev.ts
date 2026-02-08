import { existsSync, readFileSync, rmSync } from 'fs';
import { $ } from 'bun';

const projectDir = 'absolutejs-project';

// Reset database if the scaffolded project has a db:reset script
if (existsSync(`${projectDir}/package.json`)) {
	const pkg = JSON.parse(readFileSync(`${projectDir}/package.json`, 'utf-8'));
	if (pkg.scripts?.['db:reset']) {
		const res = await $`bun run db:reset`.cwd(projectDir).quiet().nothrow();
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
