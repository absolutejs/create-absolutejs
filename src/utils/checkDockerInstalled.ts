import { existsSync, writeFileSync } from 'fs';
import os from 'os';
import { env, platform } from 'process';
import { confirm, spinner } from '@clack/prompts';
import { $ } from 'bun';
import { dim, yellow } from 'picocolors';

const DOCKER_URL = 'https://www.docker.com/products/docker-desktop';
const DOCKER_WIN_INSTALLER_URL =
	'https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe';
const DOCKER_WIN_BIN_PATH = 'C:\\Program Files\\Docker\\Docker\\resources\\bin';

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

const installWindowsDirectDownload = async () => {
	const spin = spinner();
	spin.start('Downloading Docker Desktop installer…');
	const tmpDir = os.tmpdir();
	const installerPath = `${tmpDir}\\DockerDesktopInstaller.exe`;
	try {
		const res = await fetch(DOCKER_WIN_INSTALLER_URL);
		if (!res.ok) return false;
		const buffer = await res.arrayBuffer();
		writeFileSync(installerPath, new Uint8Array(buffer));
		spin.stop('Docker Desktop installer downloaded');
		spin.start('Running Docker Desktop installer…');
		const runRes =
			await $`powershell.exe -NoProfile -Command "Start-Process -FilePath '${installerPath}' -ArgumentList 'install','--quiet','--accept-license' -Wait -Verb RunAs"`
				.quiet()
				.nothrow();
		spin.stop(
			runRes.exitCode === 0
				? 'Docker Desktop installed'
				: 'Installer failed'
		);

		return runRes.exitCode === 0;
	} catch {
		spin.stop('Direct download failed');

		return false;
	}
};

const installWindowsOpenBrowser = async () => {
	await $`powershell.exe -NoProfile -Command "Start-Process '${DOCKER_URL}'"`
		.quiet()
		.nothrow();
	console.log(
		`Opened Docker Desktop download page. Install it, then run this again.`
	);

	return false;
};

const installWindows = async () => {
	if (await installWindowsDirectDownload()) return true;
	await installWindowsOpenBrowser();

	return false;
};

const installWSL = async () => {
	if ((await $`docker.exe --version`.quiet().nothrow()).exitCode === 0)
		return true;
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

const installDockerForHost = async (host: string) => {
	if (host === 'windows') return installWindows();
	if (host === 'wsl') return installWSL();
	if (host === 'linux') return installLinux();

	return false;
};

const DAEMON_WAIT_ATTEMPTS = 30;
const DAEMON_WAIT_INTERVAL_MS = 2000;

export const hasDocker = async () => {
	const docker = resolveDockerExe();

	return (
		(await $`${docker} --version`.quiet().nothrow()).exitCode === 0 &&
		(await $`${docker} compose version`.quiet().nothrow()).exitCode === 0
	);
};
export const isDockerDaemonRunning = async () => {
	const docker = resolveDockerExe();

	return (await $`${docker} info`.quiet().nothrow()).exitCode === 0;
};
export const resolveDockerExe = () => {
	if (platform === 'win32') {
		const fullPath = `${DOCKER_WIN_BIN_PATH}\\docker.exe`;
		if (existsSync(fullPath)) return fullPath;
	}

	return 'docker';
};

const sleep = (milliseconds: number) =>
	new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

const waitForDaemonReady = async (attempt = 0) => {
	if (attempt >= DAEMON_WAIT_ATTEMPTS) return false;
	if (await isDockerDaemonRunning()) return true;
	await sleep(DAEMON_WAIT_INTERVAL_MS);

	return waitForDaemonReady(attempt + 1);
};

const startDarwinDockerDesktop = async (spin: ReturnType<typeof spinner>) => {
	await $`open -a Docker`.quiet().nothrow();
	if (await waitForDaemonReady()) {
		spin.stop('Docker Desktop started');

		return true;
	}
	spin.stop('Docker daemon did not start');
	throw new Error(
		'Docker daemon did not start. Please start Docker Desktop manually.'
	);
};

const startWin32DockerDesktop = async (spin: ReturnType<typeof spinner>) => {
	const started = await startWindowsDockerDesktop();
	if (started) {
		spin.stop('Docker Desktop started');

		return true;
	}
	spin.stop('Docker Desktop start failed');
	throw new Error(
		'Docker Desktop failed to start. Please start it manually.'
	);
};

const startWindowsDockerDesktop = async () => {
	const dockerDesktopExe =
		'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe';
	if (!existsSync(dockerDesktopExe)) return false;
	await $`powershell.exe -NoProfile -Command "Start-Process '${dockerDesktopExe}'"`
		.quiet()
		.nothrow();

	return waitForDaemonReady();
};

const startDockerDaemon = async () => {
	const spin = spinner();
	spin.start('Starting Docker daemon…');
	const docker = resolveDockerExe();

	const desktopRes = await $`${docker} desktop start`.quiet().nothrow();
	if (desktopRes.exitCode === 0 && (await waitForDaemonReady())) {
		spin.stop('Docker Desktop started');

		return true;
	}

	if (platform === 'darwin') return startDarwinDockerDesktop(spin);

	if (platform === 'win32') return startWin32DockerDesktop(spin);

	await ensureSudo();
	const systemctlRes = await $`sudo systemctl start docker`.quiet().nothrow();
	if (systemctlRes.exitCode !== 0) {
		await $`sudo service docker start`.quiet().nothrow();
	}
	if (await waitForDaemonReady()) {
		spin.stop('Docker daemon started');

		return true;
	}
	spin.stop('Docker daemon did not start');
	throw new Error('Docker daemon did not start. Please start it manually.');
};

export const checkDockerInstalled = async (
	databaseEngine?: string
): Promise<{ freshInstall: boolean }> => {
	if (await hasDocker()) return { freshInstall: false };
	const dbLabel = databaseEngine ?? 'database';
	const proceed = await confirm({
		initialValue: true,
		message: `Docker Engine and Compose plugin are required for your local ${dbLabel}. Install them now?`
	});
	if (!proceed) return { freshInstall: false };
	const installed = await installDockerForHost(hostEnv);
	if (!installed) {
		console.log(
			`Couldn't install Docker automatically. Download it from ${DOCKER_URL}`
		);

		return { freshInstall: false };
	}
	if (hostEnv === 'windows' && !env.PATH?.includes(DOCKER_WIN_BIN_PATH)) {
		env.PATH = `${DOCKER_WIN_BIN_PATH};${env.PATH}`;
	}

	return { freshInstall: true };
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
	const docker = resolveDockerExe();
	const desktopRes = await $`${docker} desktop shutdown`.quiet().nothrow();
	if (desktopRes.exitCode === 0) return;
	if (platform !== 'win32') {
		await ensureSudo();
		await $`sudo systemctl stop docker`.quiet().nothrow();
	}
};
