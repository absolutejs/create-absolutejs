import type { Change } from '@absolutejs/changelog';

export const change: Change = {
	detail: '`absolute typecheck` checks Vue with vue-check on Bun 1.4.4 and newer. vue-tsc stays in Vue projects because AbsoluteJS still supports Bun 1.4.2, where it is the checker, and `ABSOLUTE_TYPECHECK_CHECKER=tsc` uses it too. The project README says when it can be removed.',
	kind: 'changed',
	summary:
		'Vue projects keep vue-tsc only as the fallback for Bun older than 1.4.4'
};
