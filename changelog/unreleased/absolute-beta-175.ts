import type { Change } from '@absolutejs/changelog';

export const change: Change = {
	detail: 'With AbsoluteJS beta.175, a route that throws is logged on the server whatever the request accepts, so React, Svelte, Vue and Angular projects and API calls log errors too, and the scaffolded HTML and HTMX error.html pages load their stylesheet in production. Angular pages keep their styles on hot updates under secureHeaders().',
	kind: 'changed',
	summary: 'New projects use @absolutejs/absolute 0.20.0-beta.175'
};
