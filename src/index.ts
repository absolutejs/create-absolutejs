#!/usr/bin/env node
import { argv, exit } from 'node:process';
import { parseArgs } from 'node:util';
import { outro } from '@clack/prompts';
import { blueBright, cyan, green, magenta, red } from 'picocolors';
import { debugMessage, helpMessage } from './messages';
import { prompt } from './prompt';
import type { FrontendFramework } from './types';
import { getUserPkgManager } from './utils';

/* eslint-disable absolute/sort-keys-fixable */
const availableFrontends: Record<string, FrontendFramework> = {
	react: { label: cyan('React'), name: 'React' },
	html: { label: 'HTML', name: 'HTML' },
	angular: { label: red('Angular'), name: 'Angular' },
	vue: { label: green('Vue'), name: 'Vue' },
	svelte: { label: magenta('Svelte'), name: 'Svelte' },
	htmx: { label: 'HTMX', name: 'HTMX' },
	solid: { label: blueBright('Solid'), name: 'Solid' }
};
/* eslint-enable absolute/sort-keys-fixable */

const DEFAULT_ARG_LENGTH = 2;
const { values } = parseArgs({
	args: argv.slice(DEFAULT_ARG_LENGTH),
	options: { help: { default: false, short: 'h', type: 'boolean' } },
	strict: false
});

const packageManager = getUserPkgManager();

if (values.help) {
	console.log(helpMessage);
	exit(0);
}

const response = await prompt(availableFrontends);

// Summary
outro(debugMessage({ availableFrontends, packageManager, response }));
