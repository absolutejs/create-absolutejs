import os from 'os';
import { env, platform } from 'process';
import { confirm, spinner } from '@clack/prompts';
import { $ } from 'bun';
import { dim, yellow } from 'picocolors';

const DOCKER_URL = 'https://www.docker.com/products/docker-desktop';

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

const runGetDocker = async () => {
	const spin = spinner();
	spin.start('Installing Docker via get.docker.com script');
	const res =
		await $`curl -fsSL https://get.docker.com | sudo sh -s -- --install-plugin compose`
			.quiet()
			.nothrow();
	spin.stop(
		res.exitCode === 0 ? 'Docker installed' : 'get.docker.com failed'
	);
	if (res.exitCode === 0) await configureDocker();

	return res.exitCode === 0;
};

const aptInstall = async () => {
	await ensureSudo();
	const spin = spinner();
	spin.start('Installing Docker Engine + Compose with apt');
	await $`sudo DEBIAN_FRONTEND=noninteractive apt-get update`.quiet();
	const res =
		await $`sudo DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends docker.io docker-compose-plugin`
			.quiet()
			.nothrow();
	if (res.exitCode === 0) {
		spin.stop('Docker Engine + Compose installed');
		await configureDocker();

		return true;
	}
	console.warn(
		`${dim('│')}\n${yellow('▲')}  apt install failed, falling back to get.docker.com script`
	);

	return false;
};

const configureDocker = async () => {
	const spin = spinner();
	spin.start('Configuring Docker daemon & permissions');
	await $`sudo groupadd docker || true`.quiet().nothrow();
	await $`sudo usermod -aG docker ${env.USER}`.quiet().nothrow();
	await $`sudo systemctl enable --now docker`.quiet().nothrow();
	spin.stop('Docker daemon running & permissions configured');
};

const installWindows = async () => {
	if (await commandExists('winget')) {
		const spin = spinner();
		spin.start('Installing Docker Desktop with winget');
		const res = await $`winget install -e --id Docker.DockerDesktop`
			.quiet()
			.nothrow();
		spin.stop(
			res.exitCode === 0
				? 'Docker Desktop installed'
				: 'winget install failed'
		);

		return res.exitCode === 0;
	}
	if (await commandExists('choco')) {
		const spin = spinner();
		spin.start('Installing Docker Desktop with Chocolatey');
		const res = await $`choco install docker-desktop -y`.quiet().nothrow();
		spin.stop(
			res.exitCode === 0
				? 'Docker Desktop installed'
				: 'Chocolatey install failed'
		);

		return res.exitCode === 0;
	}
	console.log(
		`Automatic Windows install failed. Get Docker Desktop from ${DOCKER_URL}`
	);

	return false;
};

const installWSL = async () => {
	if ((await $`docker.exe --version`.quiet().nothrow()).exitCode === 0)
		return true;
	if (await commandExists('powershell.exe')) {
		const spin = spinner();
		spin.start('Installing Docker Desktop on Windows via winget');
		const res =
			await $`powershell.exe -NoProfile -Command winget install -e --id Docker.DockerDesktop`
				.quiet()
				.nothrow();
		spin.stop(
			res.exitCode === 0
				? 'Docker Desktop installed'
				: 'winget install failed'
		);
		if (res.exitCode === 0) return true;
	}
	if (await aptInstall()) return true;

	return runGetDocker();
};

const installLinux = async () => {
	if (await commandExists('apt-get')) {
		if (await aptInstall()) return true;

		return runGetDocker();
	}
	if (await commandExists('dnf')) {
		const spin = spinner();
		spin.start('Installing Docker Engine and Compose plugin with dnf');
		const res = await $`sudo dnf install -y docker docker-compose-plugin`
			.quiet()
			.nothrow();
		spin.stop(
			res.exitCode === 0
				? 'Docker Engine + Compose installed'
				: 'dnf install failed'
		);
		if (res.exitCode === 0) await configureDocker();

		return res.exitCode === 0;
	}
	if (await commandExists('pacman')) {
		const spin = spinner();
		spin.start('Installing Docker Engine and Compose plugin with pacman');
		const res = await $`sudo pacman -S --noconfirm docker docker-compose`
			.quiet()
			.nothrow();
		spin.stop(
			res.exitCode === 0
				? 'Docker Engine + Compose installed'
				: 'pacman install failed'
		);
		if (res.exitCode === 0) await configureDocker();

		return res.exitCode === 0;
	}
	if (await commandExists('apk')) {
		const spin = spinner();
		spin.start('Installing Docker Engine and Compose plugin with apk');
		const res = await $`sudo apk add docker docker-cli-compose`
			.quiet()
			.nothrow();
		spin.stop(
			res.exitCode === 0
				? 'Docker Engine + Compose installed'
				: 'apk install failed'
		);
		if (res.exitCode === 0) await configureDocker();

		return res.exitCode === 0;
	}
	console.log(`Automatic Linux install failed. See ${DOCKER_URL}`);

	return false;
};

const DAEMON_MACOS_WAIT_ATTEMPTS = 15;
const DAEMON_MACOS_WAIT_INTERVAL_MS = 2000;

export const hasDocker = async () =>
	(await $`docker --version`.quiet().nothrow()).exitCode === 0 &&
	(await $`docker compose version`.quiet().nothrow()).exitCode === 0;

export const isDockerDaemonRunning = async () =>
	(await $`docker info`.quiet().nothrow()).exitCode === 0;

const startDockerDaemon = async (): Promise<boolean> => {
	const spin = spinner();
	spin.start('Starting Docker daemon…');

	const desktopRes = await $`docker desktop start`.quiet().nothrow();
	if (desktopRes.exitCode === 0) {
		spin.stop('Docker Desktop started');
		return true;
	}

	if (platform === 'darwin') {
		await $`open -a Docker`.quiet().nothrow();
		spin.stop('Docker Desktop launched');
		for (let attempt = 0; attempt < DAEMON_MACOS_WAIT_ATTEMPTS; attempt++) {
			if (await isDockerDaemonRunning()) {
				return true;
			}
			await new Promise((resolve) =>
				setTimeout(resolve, DAEMON_MACOS_WAIT_INTERVAL_MS)
			);
		}
		throw new Error(
			'Docker daemon did not start. Please start Docker Desktop manually.'
		);
	}

	if (platform === 'win32') {
		spin.stop('Docker Desktop start failed');
		throw new Error(
			'Docker Desktop failed to start. Please start it manually.'
		);
	}

	await ensureSudo();
	const systemctlRes = await $`sudo systemctl start docker`.quiet().nothrow();
	if (systemctlRes.exitCode !== 0) {
		await $`sudo service docker start`.quiet().nothrow();
	}
	spin.stop('Docker daemon started');
	const isReady = (await $`docker info`.quiet().nothrow()).exitCode === 0;
	if (!isReady) {
		throw new Error(
			'Docker daemon did not start. Please start it manually.'
		);
	}

	return true;
};

export const ensureDockerDaemonRunning = async (): Promise<{
	daemonWasStarted: boolean;
}> => {
	if (await isDockerDaemonRunning()) {
		return { daemonWasStarted: false };
	}
	await startDockerDaemon();
	return { daemonWasStarted: true };
};

export const shutdownDockerDaemon = async () => {
	const desktopRes = await $`docker desktop shutdown`.quiet().nothrow();
	if (desktopRes.exitCode === 0) return;
	if (platform !== 'win32') {
		await ensureSudo();
		await $`sudo systemctl stop docker`.quiet().nothrow();
	}
};

export const checkDockerInstalled = async () => {
	if (await hasDocker()) return;
	const proceed = await confirm({
		initialValue: true,
		message:
			'Docker Engine and Compose plugin are required for local Postgresql. Install them now?'
	});
	if (!proceed) return;
	switch (hostEnv) {
		case 'windows':
			if (await installWindows()) return;
			break;
		case 'wsl':
			if (await installWSL()) return;
			break;
		case 'linux':
			if (await installLinux()) return;
			break;
	}
	console.log(
		`Couldn't install Docker automatically. Download it from ${DOCKER_URL}`
	);
};
