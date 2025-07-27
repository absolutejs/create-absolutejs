import { availableDrizzleDialects } from '../../data';
import type { CreateConfiguration } from '../../types';

type DBExpr = { expr: string; connect?: boolean };

const connectionMap: Record<string, Record<string, DBExpr>> = {
	cockroachdb: {
		none: { connect: true, expr: 'new SQL(getEnv("DATABASE_URL"))' }
	},
	gel: {
		none: { expr: 'gelClient({ url: getEnv("DATABASE_URL") })' }
	},
	mariadb: {
		none: { expr: 'createPool(getEnv("DATABASE_URL"))' }
	},
	mongodb: {
		none: { expr: 'new MongoClient(getEnv("DATABASE_URL"))' }
	},
	mssql: {
		none: { expr: 'connect(getEnv("DATABASE_URL"))' }
	},
	mysql: {
		none: { expr: 'createPool(getEnv("DATABASE_URL"))' },
		planetscale: { expr: 'connect({ url: getEnv("DATABASE_URL") })' }
	},
	postgresql: {
		neon: { expr: 'neon(getEnv("DATABASE_URL"))' },
		none: { connect: true, expr: 'new SQL(getEnv("DATABASE_URL"))' }
	},
	singlestore: {
		none: { expr: 'createClient({ url: getEnv("DATABASE_URL") })' }
	},
	sqlite: {
		none: { expr: 'new Database("db/database.sqlite")' },
		turso: { expr: 'createClient({ url: getEnv("DATABASE_URL") })' }
	}
};

const remoteDrizzleInit: Record<string, string> = {
	neon: 'neon(getEnv("DATABASE_URL"))',
	planetscale: 'connect({ url: getEnv("DATABASE_URL") })',
	turso: 'createClient({ url: getEnv("DATABASE_URL") })'
};

const drizzleDialectSet = new Set<string>([...availableDrizzleDialects]);

type GenerateDBBlockProps = Pick<
	CreateConfiguration,
	'databaseEngine' | 'orm' | 'databaseHost'
>;

export const generateDBBlock = ({
	databaseEngine,
	orm,
	databaseHost
}: GenerateDBBlockProps) => {
	if (!databaseEngine || databaseEngine === 'none') {
		throw new Error(
			'Internal type error: Expected a valid database engine'
		);
	}

	const hostKey = databaseHost ?? 'none';
	const engineGroup = connectionMap[databaseEngine];
	if (!engineGroup) return '';

	if (orm !== 'drizzle') {
		const hostCfg = engineGroup[hostKey];
		if (!hostCfg) return '';

		return `
const db = ${hostCfg.expr}
${hostCfg.connect ? 'await db.connect();\n' : ''}
`;
	}

	if (!drizzleDialectSet.has(databaseEngine)) return '';

	const expr = engineGroup[hostKey]?.expr ?? remoteDrizzleInit[hostKey];
	if (!expr) return '';

	return `
const sql = ${expr}
const db = drizzle(sql, { schema })
`;
};
