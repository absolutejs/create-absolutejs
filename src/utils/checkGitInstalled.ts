import os from 'os';
import { env, platform } from 'process';
import { confirm, spinner } from '@clack/prompts';
import { $ } from 'bun';
import { dim, yellow } from 'picocolors';

/**
 * Official Git download URL for manual installation instructions
 */
const GIT_URL = 'https://git-scm.com/downloads';

/**
 * Detects if the current environment is Windows Subsystem for Linux (WSL)
 * by checking the WSL_DISTRO_NAME environment variable or kernel release string
 */
const isWSL = () =>
	env.WSL_DISTRO_NAME !== undefined || /microsoft/i.test(os.release());

/**
 * Determines the host environment type for platform-specific installation logic
 */
let hostEnv: 'windows' | 'wsl' | 'linux' | 'darwin';
if (platform === 'win32') {
	hostEnv = 'windows';
} else if (platform === 'darwin') {
	hostEnv = 'darwin';
} else if (isWSL()) {
	hostEnv = 'wsl';
} else {
	hostEnv = 'linux';
}

/**
 * Checks if a command exists in the system PATH
 * Uses platform-specific commands (where on Windows, command -v on Unix)
 * 
 * @param cmd - The command name to check
 * @returns Promise<boolean> - true if command exists, false otherwise
 */
const commandExists = async (cmd: string) =>
	(platform === 'win32'
		? await $`where ${cmd}`.quiet().nothrow()
		: await $`command -v ${cmd}`.quiet().nothrow()
	).exitCode === 0;

/**
 * Ensures sudo access is available for the current user
 * Prompts for password if needed and caches credentials
 */
const ensureSudo = async () => {
	if ((await $`sudo -n true`.nothrow()).exitCode !== 0) {
		console.log(`${dim('│')}\n${yellow('▲')}  sudo password required`);
		await $`sudo -v`;
	}
};

/**
 * Installs Git on Linux systems using apt package manager
 * Attempts to install git and common dependencies
 * 
 * @returns Promise<boolean> - true if installation succeeded
 */
const aptInstall = async () => {
	await ensureSudo();
	const spin = spinner();
	spin.start('Installing Git with apt');
	await $`sudo DEBIAN_FRONTEND=noninteractive apt-get update`.quiet();
	const res =
		await $`sudo DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends git`
			.quiet()
			.nothrow();
	
	if (res.exitCode === 0) {
		spin.stop('Git installed successfully');

		return true;
	}

	spin.stop('apt install failed');

	return false;
};

/**
 * Installs Git on Linux systems using yum package manager (RHEL/CentOS/Fedora)
 * 
 * @returns Promise<boolean> - true if installation succeeded
 */
const yumInstall = async () => {
	await ensureSudo();
	const spin = spinner();
	spin.start('Installing Git with yum');
	const res = await $`sudo yum install -y git`.quiet().nothrow();

	if (res.exitCode === 0) {
		spin.stop('Git installed successfully');

		return true;
	}

	spin.stop('yum install failed');

	return false;
};

/**
 * Installs Git using dnf package manager (newer Fedora)
 * 
 * @returns Promise<boolean> - true if installation succeeded
 */
const dnfInstall = async () => {
	await ensureSudo();
	const spin = spinner();
	spin.start('Installing Git with dnf');
	const res = await $`sudo dnf install -y git`.quiet().nothrow();

	if (res.exitCode === 0) {
		spin.stop('Git installed successfully');

		return true;
	}

	spin.stop('dnf install failed');

	return false;
};

/**
 * Installs Git using pacman package manager (Arch Linux)
 * 
 * @returns Promise<boolean> - true if installation succeeded
 */
const pacmanInstall = async () => {
	await ensureSudo();
	const spin = spinner();
	spin.start('Installing Git with pacman');
	const res = await $`sudo pacman -S --noconfirm git`.quiet().nothrow();

	if (res.exitCode === 0) {
		spin.stop('Git installed successfully');

		return true;
	}

	spin.stop('pacman install failed');

	return false;
};

/**
 * Installs Git on macOS using Homebrew package manager
 * Assumes Homebrew is already installed (common on macOS)
 * 
 * @returns Promise<boolean> - true if installation succeeded
 */
const brewInstall = async () => {
	const spin = spinner();
	spin.start('Installing Git with Homebrew');
	const res = await $`brew install git`.quiet().nothrow();

	if (res.exitCode === 0) {
		spin.stop('Git installed successfully');

		return true;
	}

	spin.stop('Homebrew install failed');

	return false;
};

/**
 * Attempts to install Git on Windows
 * Directs user to official download page since automated installation
 * requires more complex setup (winget, chocolatey, or manual installer)
 * 
 * @returns Promise<boolean> - always returns false (manual installation required)
 */
const installWindows = async () => {
	console.log(
		`${dim('│')}\n${yellow('▲')}  Please download Git for Windows from: ${GIT_URL}`
	);
	console.log(`${dim('│')}   Recommended: Enable "Git from the command line" during installation`);

	return false;
};

/**
 * Attempts to install Git on WSL systems
 * Uses the Linux distribution's package manager
 * 
 * @returns Promise<boolean> - true if installation succeeded
 */
const installWSL = async () => {
	// Try apt first (Ubuntu/Debian-based WSL distros are most common)
	if (await commandExists('apt-get')) {
		return aptInstall();
	}

	// Try yum for RHEL-based distros
	if (await commandExists('yum')) {
		return yumInstall();
	}
	
	console.log(
		`${dim('│')}\n${yellow('▲')}  Could not detect package manager. Please install git manually.`
	);

	return false;
};

/**
 * Attempts to install Git on Linux systems
 * Detects and uses the appropriate package manager
 * 
 * @returns Promise<boolean> - true if installation succeeded
 */
const installLinux = async () => {
	// Try apt first (Debian/Ubuntu)
	if (await commandExists('apt-get')) {
		return aptInstall();
	}

	// Try yum (RHEL/CentOS/Fedora)
	if (await commandExists('yum')) {
		return yumInstall();
	}

	// Try dnf (newer Fedora)
	if (await commandExists('dnf')) {
		return dnfInstall();
	}

	// Try pacman (Arch Linux)
	if (await commandExists('pacman')) {
		return pacmanInstall();
	}
	
	console.log(
		`${dim('│')}\n${yellow('▲')}  Could not detect package manager. Please install git manually from: ${GIT_URL}`
	);

	return false;
};

/**
 * Checks if Git is installed and accessible
 * 
 * @returns Promise<boolean> - true if git is installed
 */
export const hasGit = async () =>
	(await $`git --version`.quiet().nothrow()).exitCode === 0;

/**
 * Checks if Git is installed, and if not, prompts user to install it
 * Attempts automatic installation on supported platforms, or directs
 * user to manual installation instructions
 * 
 * @returns Promise<boolean> - true if git is available after this function completes
 */
export const checkGitInstalled = async () => {
	// Git is already installed
	if (await hasGit()) return true;
	
	// Prompt user to install Git
	const proceed = await confirm({
		initialValue: true,
		message: 'Git is required for project initialization. Install it now?'
	});
	
	if (!proceed) return false;
	
	// Attempt platform-specific installation
	switch (hostEnv) {
		case 'windows':
			await installWindows();
			break;
		case 'darwin':
			if (await commandExists('brew')) {
				if (await brewInstall()) return hasGit();
			}
			console.log(
				`${dim('│')}\n${yellow('▲')}  Please install Git from: ${GIT_URL}`
			);
			break;
		case 'wsl':
			if (await installWSL()) return hasGit();
			break;
		case 'linux':
			if (await installLinux()) return hasGit();
			break;
	}
	
	// Installation failed or not automated - direct user to manual installation
	console.log(
		`${dim('│')}\n${yellow('▲')}  Couldn't install Git automatically. Please download it from: ${GIT_URL}`
	);
	console.log(`${dim('│')}   After installation, restart your terminal and try again.`);

	return hasGit();
};
