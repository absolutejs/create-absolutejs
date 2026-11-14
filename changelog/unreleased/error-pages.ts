import type { Change } from '@absolutejs/changelog';

export const change: Change = {
	detail: 'server.ts ended with its own `.onError(...)` after the routes. Registered there it never saw their errors, but since AbsoluteJS beta.171 any app `onError` stops the framework rendering `error.html`, so a throwing route answered a browser with a JSON 500 and nothing was logged. The handler also logged a full stack for every 404. server.ts no longer registers one, and HTML and HTMX projects get a `pages/error.html`. A route that throws on a page or HTMX request now renders it with status 500, AbsoluteJS logs the error on the server, and 404s log nothing. Outside development the page shows a generic message and no stack.',
	kind: 'fixed',
	summary:
		'A route that throws on an HTML or HTMX page renders error.html, and the error is logged'
};
