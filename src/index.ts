#!/usr/bin/env node
import { argv, exit } from 'node:process';
import { parseArgs } from 'node:util';
import { outro } from '@clack/prompts';
import { cyan, green } from 'picocolors';
import { availableFrontends } from './data';
import { getSummaryMessage, helpMessage } from './messages';
import { prompt } from './prompt';
import { scaffold } from './scaffolding/scaffold';
import { getUserPackageManager } from './utils/t3-utils';

const DEFAULT_ARG_LENGTH = 2;
const { values } = parseArgs({
	args: argv.slice(DEFAULT_ARG_LENGTH),
	options: {
		help: { default: false, short: 'h', type: 'boolean' },
		summary: { default: false, short: 's', type: 'boolean' }
	},
	strict: false
});

const packageManager = getUserPackageManager();

if (values.help) {
	console.log(helpMessage);
	exit(0);
}

const response = await prompt();
const summaryMessage = getSummaryMessage({
	availableFrontends,
	packageManager,
	response
});

let outroMessage =
	`${green('Created successfully')}, you can now run:\n\n` +
	`${cyan('cd')} ${response.projectName}\n` +
	`${cyan(`${packageManager} dev`)}${
		response.installDependencies
			? ''
			: `\n${cyan(`${packageManager} install`)}`
	}`;

if (values.summary) {
	outroMessage += `\n${summaryMessage}`;
}

scaffold(response, packageManager);

outro(outroMessage);
