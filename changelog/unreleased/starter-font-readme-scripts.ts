import type { Change } from '@absolutejs/changelog';

export const change: Change = {
	detail: 'The React and Svelte starters linked Google Fonts with a URL Google rejects (Poppins has no variable weight axis), so the font never loaded, and under secureHeaders() the link was a CSP violation. Poppins is now self-hosted through the `fonts` config in absolute.config.ts at the weights the starters use and applied to the page; the pages link it with `fontAssets(manifest)`. New projects also get `build` and `start` scripts (the README already told you to run `bun run build`), and only Vue projects get the README paragraph about vue-tsc.',
	kind: 'fixed',
	summary:
		'React and Svelte starters load their font under secureHeaders(); `bun run build` and `bun run start` work'
};
