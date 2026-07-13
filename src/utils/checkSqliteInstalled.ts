import os from 'os';
import { env, platform, stdin, stdout } from 'process';
import { confirm, spinner } from '@clack/prompts';
import { $ } from 'bun';
import { dim, yellow } from 'picocolors';

const SQLITE_URL = 'https://sqlite.org/download.html';

const isWSL = () =>
	env.WSL_DISTRO_NAME !== undefined || /microsoft/i.test(os.release());

let hostEnv;
if (platform === 'win32') {
	hostEnv = 'windows';
} else if (isWSL()) {
	hostEnv = 'wsl';
} else {
	hostEnv = 'linux';
}

const commandExists = async (cmd: string) =>
	(platform === 'win32'
		? await $`where ${cmd}`.quiet().nothrow()
		: await $`command -v ${cmd}`.quiet().nothrow()
	).exitCode === 0;

const ensureSudo = async () => {
	if ((await $`sudo -n true`.nothrow()).exitCode !== 0) {
		console.log(`${dim('│')}\n${yellow('▲')}  sudo password required`);
		await $`sudo -v`;
	}
};

const hasSqlite = async () =>
	(await $`sqlite3 --version`.quiet().nothrow()).exitCode === 0;

const aptInstallSqlite = async () => {
	await ensureSudo();
	const spin = spinner();
	spin.start('Installing sqlite3 with apt');
	await $`sudo DEBIAN_FRONTEND=noninteractive apt-get update`.quiet();
	const res =
		await $`sudo DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends sqlite3`
			.quiet()
			.nothrow();
	spin.stop(res.exitCode === 0 ? 'sqlite3 installed' : 'apt install failed');

	return res.exitCode === 0;
};

const dnfInstallSqlite = async () => {
	const spin = spinner();
	spin.start('Installing sqlite3 with dnf');
	const res = await $`sudo dnf install -y sqlite`.quiet().nothrow();
	spin.stop(res.exitCode === 0 ? 'sqlite3 installed' : 'dnf install failed');

	return res.exitCode === 0;
};

const pacmanInstallSqlite = async () => {
	const spin = spinner();
	spin.start('Installing sqlite3 with pacman');
	const res = await $`sudo pacman -S --noconfirm sqlite`.quiet().nothrow();
	spin.stop(
		res.exitCode === 0 ? 'sqlite3 installed' : 'pacman install failed'
	);

	return res.exitCode === 0;
};

const apkInstallSqlite = async () => {
	const spin = spinner();
	spin.start('Installing sqlite3 with apk');
	const res = await $`sudo apk add sqlite`.quiet().nothrow();
	spin.stop(res.exitCode === 0 ? 'sqlite3 installed' : 'apk install failed');

	return res.exitCode === 0;
};

const hasWinget = async () =>
	(
		await $`powershell.exe -NoProfile -Command "Get-Command winget"`
			.quiet()
			.nothrow()
	).exitCode === 0;

const installWindowsSqlite = async () => {
	if (await hasWinget()) {
		const spin = spinner();
		spin.start('Updating winget sources');
		await $`powershell.exe -NoProfile -Command winget source update`
			.quiet()
			.nothrow();
		spin.stop('winget sources updated');
		spin.start('Installing sqlite3 with winget');
		await $`powershell.exe -NoProfile -Command "Start-Process winget -ArgumentList 'install','-e','--id','SQLite.SQLite','--accept-package-agreements','--accept-source-agreements' -Verb RunAs -Wait"`
			.quiet()
			.nothrow();
		const installed = await hasSqlite();
		spin.stop(installed ? 'sqlite3 installed' : 'winget install failed');

		return installed;
	}
	console.log(
		`Automatic Windows install failed. Get sqlite3 from ${SQLITE_URL}`
	);

	return false;
};

const installWSLSqlite = async () => {
	if (await hasSqlite()) return true;
	if (await aptInstallSqlite()) return true;

	return false;
};

const installLinuxSqlite = async () => {
	if (await commandExists('apt-get')) {
		if (await aptInstallSqlite()) return true;
	}
	if (await commandExists('dnf')) {
		if (await dnfInstallSqlite()) return true;
	}
	if (await commandExists('pacman')) {
		if (await pacmanInstallSqlite()) return true;
	}
	if (await commandExists('apk')) {
		if (await apkInstallSqlite()) return true;
	}
	console.log(`Automatic Linux install failed. See ${SQLITE_URL}`);

	return false;
};

export const checkSqliteInstalled = async () => {
	if (await hasSqlite()) return;
	// Non-interactive contexts (the Studio container, CI, any piped stdin)
	// must never block on a prompt — and sudo-based installs can't work
	// there anyway. The CLI is optional (scaffolding seeds via bun:sqlite);
	// mention it and move on.
	if (!stdin.isTTY || !stdout.isTTY || env.CI) {
		console.log(
			`${dim('│')}\n${yellow('▲')}  sqlite3 CLI not found — optional; your database still works. Install it later for a db shell: ${SQLITE_URL}`
		);

		return;
	}
	const proceed = await confirm({
		initialValue: true,
		message:
			'sqlite3 CLI is optional (handy as a db shell). Install now?'
	});
	if (!proceed) return;
	switch (hostEnv) {
		case 'windows':
			if (await installWindowsSqlite()) return;
			break;
		case 'wsl':
			if (await installWSLSqlite()) return;
			break;
		case 'linux':
			if (await installLinuxSqlite()) return;
			break;
	}
	console.log(
		`Couldn't install sqlite3 automatically. Download it from ${SQLITE_URL}`
	);
};
