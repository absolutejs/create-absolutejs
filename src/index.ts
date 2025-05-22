#!/usr/bin/env node
import { argv, exit } from 'node:process';
import { parseArgs } from 'node:util';
import { outro } from '@clack/prompts';
import { DEFAULT_ARG_LENGTH } from './constants';
import { availableFrontends } from './data';
import { getDebugMessage, getOutroMessage, helpMessage } from './messages';
import { prompt } from './prompt';
import { scaffold } from './scaffold';
import { getUserPackageManager } from './utils/t3-utils';

const { values } = parseArgs({
	args: argv.slice(DEFAULT_ARG_LENGTH),
	options: {
		debug: { default: false, short: 'd', type: 'boolean' },
		help: { default: false, short: 'h', type: 'boolean' },
		latest: { default: false, short: 'l', type: 'boolean' }
	},
	strict: false
});

const packageManager = getUserPackageManager();

if (values.help === true) {
	console.log(helpMessage);
	exit(0);
}

const response = await prompt();

scaffold({ latest: values.latest === true, packageManager, response });

const debugMessage =
	values.debug !== false
		? getDebugMessage({
				availableFrontends,
				packageManager,
				response
			})
		: '';

const outroMessage = getOutroMessage({
	installDependenciesNow: response.installDependenciesNow,
	packageManager,
	projectName: response.projectName
});

outro(debugMessage + outroMessage);
