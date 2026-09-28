import type { Change } from '@absolutejs/changelog';

export const change: Change = {
	detail: 'AbsoluteJS beta.124 accepts `@absolutejs/auth` up to 0.96, so a project that adds a current auth no longer also gets auth 0.76.3 nested under AbsoluteJS. The duplicate had doubled the auth type declarations TypeScript loads. beta.124 also stops `/hmr-status` from counting closed or duplicate HMR clients.',
	kind: 'changed',
	summary: 'New projects use @absolutejs/absolute 0.20.0-beta.124: one copy of @absolutejs/auth instead of two'
};
