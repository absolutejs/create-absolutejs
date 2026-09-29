import type { Change } from '@absolutejs/changelog';

export const change: Change = {
	detail: 'AbsoluteJS beta.125 fixes Vue pages that reach a helper only through a re-export (`export { x } from "./y"`). Those helpers were never copied into the generated tree, so the page failed to build and answered 500 in dev.',
	kind: 'changed',
	summary: 'New projects use @absolutejs/absolute 0.20.0-beta.125: Vue pages build through helper re-exports'
};
