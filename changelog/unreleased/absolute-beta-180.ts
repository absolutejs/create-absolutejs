import type { Change } from '@absolutejs/changelog';

export const change: Change = {
	detail: 'With AbsoluteJS beta.180, `absolute typecheck` rejects `asset(manifest, key)` keys the build does not write. The generated tsconfig.json includes `.absolutejs/types/manifest.d.ts`, where AbsoluteJS writes those keys, so editors check them too, and `absolute typecheck` no longer prints a note asking for it.',
	kind: 'changed',
	summary:
		'New projects use @absolutejs/absolute 0.20.0-beta.180, and editors check asset() keys'
};
