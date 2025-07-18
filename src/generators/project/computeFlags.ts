import type { FrontendDirectories } from '../../types';

export type FrameworkFlags = ReturnType<typeof computeFlags>;

export const computeFlags = (dirs: FrontendDirectories) => ({
	requiresHtml: dirs.html !== undefined,
	requiresHtmx: dirs.htmx !== undefined,
	requiresReact: dirs.react !== undefined,
	requiresSvelte: dirs.svelte !== undefined,
	requiresVue: dirs.vue !== undefined
});
