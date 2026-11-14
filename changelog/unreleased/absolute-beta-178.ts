import type { Change } from '@absolutejs/changelog';

export const change: Change = {
	detail: 'With AbsoluteJS beta.178, `absolute typecheck` runs every framework\'s checker side by side, so projects with Vue and Svelte or React check all of them; JSON requests to unknown routes get a JSON 404 instead of the not-found page; and Svelte and Vue island styles load under secureHeaders().',
	kind: 'changed',
	summary: 'New projects use @absolutejs/absolute 0.20.0-beta.178'
};
