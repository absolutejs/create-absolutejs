#!/usr/bin/env node
import { argv, exit } from 'node:process';
import { parseArgs } from 'node:util';
import { outro } from '@clack/prompts';
import { availableFrontends } from './data';
import { getDebugMessage, getOutroMessage, helpMessage } from './messages';
import { prompt } from './prompt';
import { scaffold } from './scaffold';
import { getUserPackageManager } from './utils/t3-utils';
import { DEFAULT_ARG_LENGTH } from './constants';

const { values } = parseArgs({
	args: argv.slice(DEFAULT_ARG_LENGTH),
	options: {
		help: { default: false, short: 'h', type: 'boolean' },
		debug: { default: false, short: 'd', type: 'boolean' }
	},
	strict: false
});

const packageManager = getUserPackageManager();

if (values.help) {
	console.log(helpMessage);
	exit(0);
}

const response = await prompt();

scaffold(response, packageManager);

const debugMessage =
	values.debug !== undefined
		? getDebugMessage({
				availableFrontends,
				packageManager,
				response
			})
		: '';

const outroMessage = getOutroMessage({
	projectName: response.projectName,
	packageManager,
	installDependenciesNow: response.installDependenciesNow
});

outro(debugMessage + outroMessage);
