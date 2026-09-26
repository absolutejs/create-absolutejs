/** Published release channels compatible with the generated framework contract. */
export const registryChannel = (name: string) => {
	// Published AbsoluteJS plugins still use ElysiaStatus.code, renamed in newer betas.
	if (name === 'elysia') return '2.0.0-beta.6';
	if (name === '@elysia/openapi') return '2.0.0-beta.2';
	if (name.startsWith('@elysia/')) return 'next';
	if (name === '@absolutejs/absolute') return 'beta';
	if (name === 'drizzle-orm' || name === 'drizzle-kit') return 'rc';
	if (name.startsWith('@angular/')) return 'v21-lts';
	// AbsoluteJS's compiler integration and Angular 21 require TypeScript 5.9.
	if (name === 'typescript') return '5.9.3';

	return 'latest';
};
