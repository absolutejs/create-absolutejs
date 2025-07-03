#!/usr/bin/env bun
import { exit } from 'node:process';
import { outro } from '@clack/prompts';
import { getDebugMessage, getOutroMessage, helpMessage } from './messages';
import { prompt } from './prompt';
import { scaffold } from './scaffold';
import { parseCommandLineOptions } from './utils/parseCommandLineOptions';
import { getUserPackageManager } from './utils/t3-utils';

const packageManager = getUserPackageManager();

const { help, argumentConfiguration, latest, debug } =
	parseCommandLineOptions();

if (help === true) {
	console.log(helpMessage);
	exit(0);
}

const response = await prompt(argumentConfiguration);

scaffold({ latest, packageManager, response });

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
