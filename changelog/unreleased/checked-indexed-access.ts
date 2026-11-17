import type { Change } from '@absolutejs/changelog';

export const change: Change = {
	detail: 'All frontend starters now include noUncheckedIndexedAccess alongside strict. Missing route parameters and other dictionary entries must be handled before indexing or dereferencing. Existing projects are not rewritten; opt-in migration guidance is in the README.',
	kind: 'changed',
	summary: 'New projects enable noUncheckedIndexedAccess to catch missing array and dictionary values'
};
