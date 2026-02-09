import { $ } from 'bun';

let cleaned = false;
let proc: ReturnType<typeof Bun.spawn> | null = null;

const cleanup = async () => {
	if (cleaned) return;
	cleaned = true;
	proc?.kill();
	await $`bun db:down`.quiet().nothrow();
};

const onExit = () => {
	void cleanup().then(() => process.exit(0));
};

process.on('SIGINT', onExit);
process.on('SIGTERM', onExit);

await $`bun db:up`;
proc = Bun.spawn(['bun', 'run', '--watch', 'src/backend/server.ts'], {
	stdio: ['inherit', 'inherit', 'inherit'],
	onExit() {
		void cleanup().then(() => process.exit(0));
	}
});

await proc.exited;
await cleanup();
process.exit(0);
