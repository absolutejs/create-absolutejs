import type { Change } from '@absolutejs/changelog';

export const change: Change = {
	detail: 'AbsoluteJS beta.170 fixes production security holes: page props, request context, island state and JSON-LD can no longer break out of their inline scripts, production servers no longer run development code paths or expose stacks on error pages, and the server bundle, SSR bundles and runtime manifests are no longer served as static files. Production servers also start from a read-only build directory, as in a non-root container, and stack traces point at the source. `absolute add` now edits the config this tool generates. Svelte HMR keeps component state, and Svelte pages that use context work under `absolute start`. New opt-in features include `secureHeaders()`, form actions, file routes, internationalization, self-hosted fonts, Web Vitals reporting, HTML includes and cross-framework navigation. The generated starters need no changes: their HTML and HTMX pages have distinct names, and they use no `{#await}` blocks or `pageRouterPlugin`, the two breaking changes and the one removal.',
	kind: 'changed',
	summary:
		'New projects use @absolutejs/absolute 0.20.0-beta.170, with its production security fixes'
};
