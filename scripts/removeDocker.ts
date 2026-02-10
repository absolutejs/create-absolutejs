import { existsSync, rmSync } from 'fs';
import { env, platform } from 'process';
import { $ } from 'bun';

const log = (msg: string) => console.log(`\x1b[33m${msg}\x1b[0m`);
const dim = (msg: string) => console.log(`  \x1b[90m${msg}\x1b[0m`);

const ensureElevated = async () => {
	if (platform === 'win32') {
		const res =
			await $`powershell.exe -NoProfile -Command "([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)"`
				.quiet()
				.nothrow();
		if (res.stdout.toString().trim() !== 'True') {
			log('Requesting administrator privileges...');
			const script = import.meta.path;
			await $`powershell.exe -NoProfile -Command "Start-Process bun -ArgumentList '${script}' -Verb RunAs -Wait"`.nothrow();
			process.exit(0);
		}
	} else {
		if ((await $`sudo -n true`.quiet().nothrow()).exitCode !== 0) {
			log('sudo password required');
			await $`sudo -v`;
		}
	}
};

await ensureElevated();

log('Stopping Docker processes...');
if (platform === 'win32') {
	await $`powershell.exe -NoProfile -Command "Stop-Process -Name 'Docker Desktop','com.docker.backend','com.docker.proxy' -Force -ErrorAction SilentlyContinue"`
		.quiet()
		.nothrow();
} else {
	await $`sudo pkill -f docker`.quiet().nothrow();
}

log('Uninstalling Docker Desktop...');
const uninstaller =
	'C:\\Program Files\\Docker\\Docker\\Docker Desktop Installer.exe';
if (platform === 'win32' && existsSync(uninstaller)) {
	await $`"${uninstaller}" uninstall --quiet`.quiet().nothrow();
} else if (platform === 'darwin') {
	await $`/Applications/Docker.app/Contents/MacOS/uninstall`
		.quiet()
		.nothrow();
	await $`sudo rm -rf /Applications/Docker.app`.quiet().nothrow();
} else {
	await $`sudo apt-get remove -y docker.io docker-compose-plugin`
		.quiet()
		.nothrow();
	await $`sudo dnf remove -y docker docker-compose-plugin`.quiet().nothrow();
}

log('Removing Docker directories...');
const home = env.HOME ?? env.USERPROFILE ?? '';
const paths =
	platform === 'win32'
		? [
				`${env.LOCALAPPDATA}\\Docker`,
				`${env.APPDATA}\\Docker`,
				`${env.APPDATA}\\Docker Desktop`,
				`${env.PROGRAMDATA}\\Docker`,
				`${env.PROGRAMDATA}\\DockerDesktop`,
				'C:\\Program Files\\Docker',
				`${home}\\.docker`
			]
		: [
				`${home}/.docker`,
				`${home}/Library/Containers/com.docker.docker`,
				`${home}/Library/Group Containers/group.com.docker`,
				'/var/lib/docker',
				'/etc/docker'
			];

for (const dir of paths) {
	if (existsSync(dir)) {
		rmSync(dir, { force: true, recursive: true });
		dim(`Removed ${dir}`);
	}
}

if (platform === 'win32') {
	log('Cleaning Docker from PATH...');
	await $`powershell.exe -NoProfile -Command "$p = [Environment]::GetEnvironmentVariable('Path','Machine') -split ';' | Where-Object { $_ -notmatch 'Docker' }; [Environment]::SetEnvironmentVariable('Path', ($p -join ';'), 'Machine')"`
		.quiet()
		.nothrow();
	await $`powershell.exe -NoProfile -Command "$p = [Environment]::GetEnvironmentVariable('Path','User') -split ';' | Where-Object { $_ -notmatch 'Docker' }; [Environment]::SetEnvironmentVariable('Path', ($p -join ';'), 'User')"`
		.quiet()
		.nothrow();

	log('Removing Docker WSL distros...');
	await $`wsl --unregister docker-desktop`.quiet().nothrow();
	await $`wsl --unregister docker-desktop-data`.quiet().nothrow();
}

console.log('\n\x1b[32mDocker fully removed. Restart your terminal.\x1b[0m');
