import type { Change } from '@absolutejs/changelog';

export const change: Change = {
	detail: 'With AbsoluteJS beta.179, `absolute add <framework>` installs the same packages and versions as this scaffold, so a framework added to a project later matches one scaffolded with it. Vue pages with only a plain `<script>` work, and Vue and Svelte islands can import shared modules by a relative path.',
	kind: 'changed',
	summary: 'New projects use @absolutejs/absolute 0.20.0-beta.179'
};
