import type { Change } from '@absolutejs/changelog';
import type * as Api from '../../src/index';

export const change: Change<typeof Api> = {
	kind: 'fixed',
	summary:
		'Accept --orm none as the help text documents, and refuse unsupported database, host and ORM combinations before writing any files'
};
