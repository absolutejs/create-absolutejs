import type { CreateConfiguration } from '../../types';

export const generateDBBlock = (
	orm: CreateConfiguration['orm'],
	host: CreateConfiguration['databaseHost']
) => {
	if (orm !== 'drizzle' || !host || host === 'none') {
		return '';
	}

	const clientInitMap = {
		neon: 'const sql = neon(getEnv("DATABASE_URL"));',
		planetscale: 'const sql = connect({ url: getEnv("DATABASE_URL") });',
		turso: 'const sql = createClient({ url: getEnv("DATABASE_URL") });'
	} as const;

	const initLine = host in clientInitMap ? clientInitMap[host] : '';

	return `
${initLine}
const db = drizzle(sql, { schema });
`;
};
