import type { Frontend } from '../../types';

export const generatePrettierrc = (frontends: Frontend[]) => {
	const usesSvelte = frontends.some((frontend) => frontend === 'svelte');

	return `{
		"endOfLine": "auto",
		"printWidth": 80,
		"semi": true,
		"singleQuote": true,
		"tabWidth": 4,
		"trailingComma": "none",
		"useTabs": true
		${usesSvelte ? `,"plugins": ["prettier-plugin-svelte"],\n"overrides": [{"files": "*.svelte", "options": {"parser": "svelte"}}]` : ''}
	}`;
};
