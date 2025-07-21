import type { CreateConfiguration } from '../../types';

type GenerateDBBlockProps = Pick<
	CreateConfiguration,
	'databaseEngine' | 'orm' | 'databaseHost'
>;

export const generateDBBlock = ({
	databaseEngine,
	orm,
	databaseHost
}: GenerateDBBlockProps) => {
	const isLocalPostgres =
		databaseEngine === 'postgresql' &&
		(!databaseHost || databaseHost === 'none');
	if (isLocalPostgres && orm === 'drizzle') {
		return `
const sql = new SQL(getEnv("DATABASE_URL"))
const db = drizzle(sql, { schema })
`;
	}
	if (isLocalPostgres) {
		return `
const db = new SQL(getEnv("DATABASE_URL"))
await db.connect();
`;
	}

	const isNeonPostgres =
		databaseEngine === 'postgresql' && databaseHost === 'neon';
	if (isNeonPostgres && orm === 'drizzle') {
		return `
const sql = neon(getEnv("DATABASE_URL"))
const db = drizzle(sql, { schema })
`;
	}
	if (isNeonPostgres) {
		return `
const db = neon(getEnv("DATABASE_URL"))
`;
	}

	const isLocalSqlite =
		databaseEngine === 'sqlite' &&
		(!databaseHost || databaseHost === 'none');
	if (isLocalSqlite && orm === 'drizzle') {
		return `
const sql = new Database("database.sqlite")
const db = drizzle(sql, { schema })
`;
	}
	if (isLocalSqlite) {
		return `
const db = new Database("database.sqlite")
`;
	}

	const isTursoSqlite =
		databaseEngine === 'sqlite' && databaseHost === 'turso';
	if (isTursoSqlite && orm === 'drizzle') {
		return `
const sql = createClient({ url: getEnv("DATABASE_URL") })
const db = drizzle(sql, { schema })
`;
	}
	if (isTursoSqlite) {
		return `
const db = createClient({ url: getEnv("DATABASE_URL") })
`;
	}

	if (orm !== 'drizzle') {
		return '';
	}

	const clientInitMap = {
		neon: 'const sql = neon(getEnv("DATABASE_URL"))',
		planetscale: 'const sql = connect({ url: getEnv("DATABASE_URL") })',
		turso: 'const sql = createClient({ url: getEnv("DATABASE_URL") })'
	} as const;

	if (databaseHost === 'none' || databaseHost === undefined) {
		return ``;
	}

	const initLine = clientInitMap[databaseHost];

	return `
${initLine}
const db = drizzle(sql, { schema })
`;
};
