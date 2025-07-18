import { CreateConfiguration } from '../../types';

export const generateDBBlock = (
	orm: CreateConfiguration['orm'],
	host: CreateConfiguration['databaseHost']
) => {
	if (orm !== 'drizzle' || !host || host === 'none') return '';

	const initMap = {
		neon: 'const sql = neon(env.DATABASE_URL);',
		planetscale: 'const sql = connect({ url: env.DATABASE_URL });',
		turso: 'const sql = createClient({ url: env.DATABASE_URL });'
	} as const;

	return `
if (env.DATABASE_URL === undefined) {
  throw new Error('DATABASE_URL is not set in .env file');
}
${initMap[host]}
const db = drizzle(sql, { schema });
`;
};
