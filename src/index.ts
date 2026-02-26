#!/usr/bin/env bun
import { exit, platform } from 'process';
import { outro } from '@clack/prompts';
import { cyan, yellow } from 'picocolors';
import { getDebugMessage, getOutroMessage, helpMessage } from './messages';
import { prompt } from './prompt';
import { scaffold } from './scaffold';
import { parseCommandLineOptions } from './utils/parseCommandLineOptions';
import { getUserPackageManager } from './utils/t3-utils';

const packageManager = getUserPackageManager();

const { help, argumentConfiguration, latest, debug, envVariables } =
	parseCommandLineOptions();

if (help === true) {
	console.log(helpMessage);
	exit(0);
}

const response = await prompt(argumentConfiguration);

const { dockerFreshInstall } = await scaffold({
	envVariables,
	latest,
	packageManager,
	response
});

const debugMessage =
	debug !== false
		? getDebugMessage({
				packageManager,
				response
			})
		: '';

const outroMessage = getOutroMessage({
	installDependenciesNow: response.installDependenciesNow,
	packageManager,
	projectName: response.projectName
});

outro(outroMessage + debugMessage);

if (dockerFreshInstall && platform === 'win32') {
	console.log(
		`\n${yellow('▲')}  Docker was freshly installed. Restart your terminal for ${cyan('docker')} to be available in PATH.\n`
	);
}
