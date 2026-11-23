import type { Change } from '@absolutejs/changelog';
import type * as Api from '../../src/index';
export const change: Change<typeof Api> = {
	kind: 'fixed',
	summary:
		'Exclude configured build output and temporary HMR files from scaffold typechecking and formatting, including custom build directories'
};
