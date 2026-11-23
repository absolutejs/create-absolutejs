/** Published release channels compatible with the generated framework contract. */
export const registryChannel = (name: string) => {
	// The framework and the AbsoluteJS plugins build against Elysia 2's
	// release candidates; `next` still points at the betas.
	if (name === 'elysia' || name.startsWith('@elysia/')) return 'rc';
	if (name === '@absolutejs/absolute') return 'beta';
	if (name === 'drizzle-orm' || name === 'drizzle-kit') return 'rc';
	if (name.startsWith('@angular/')) return 'v21-lts';
	// AbsoluteJS's compiler integration and Angular 21 require TypeScript 5.9.
	if (name === 'typescript') return '5.9.3';
	// `latest` is vue-router 5, outside @absolutejs/absolute's ^4.5.1 peer
	// range, and the registry has no tag for the 4.x line.
	if (name === 'vue-router') return '4.6.4';

	return 'latest';
};
