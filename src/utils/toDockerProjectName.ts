export const toDockerProjectName = (name: string): string =>
	name
		.replace(/[^a-zA-Z0-9_-]/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '') || 'db';
