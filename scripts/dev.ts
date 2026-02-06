import { existsSync, readFileSync, rmSync } from 'fs';
import { $ } from 'bun';

const projectDir = 'absolutejs-project';

// Reset database if the scaffolded project has a db:reset script
if (existsSync(`${projectDir}/package.json`)) {
	const pkg = JSON.parse(readFileSync(`${projectDir}/package.json`, 'utf-8'));
	if (pkg.scripts?.['db:reset']) {
		await $`bun run db:reset`.cwd(projectDir);
	}
}

// Remove existing project and re-scaffold
rmSync(projectDir, { recursive: true, force: true });

const proc = Bun.spawn(['bun', 'run', 'src/index.ts'], {
	stdio: ['inherit', 'inherit', 'inherit']
});
await proc.exited;
