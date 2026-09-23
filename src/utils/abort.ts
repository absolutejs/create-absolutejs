import { exit } from 'process';
import { cancel } from '@clack/prompts';

export const abort: () => never = () => {
	cancel('Operation cancelled');
	exit(0);
};
