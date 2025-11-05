import { availableDrizzleDialects } from '../../data';
import type { CreateConfiguration } from '../../types';

type DBExpr = { expr: string };

const connectionMap: Record<string, Record<string, DBExpr>> = {
	cockroachdb: {
		none: { expr: 'new Pool({ connectionString: getEnv("DATABASE_URL") })' }
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
		none: { expr: 'await connect(getEnv("DATABASE_URL"))' }
	},
	mysql: {
		none: { expr: 'createPool(getEnv("DATABASE_URL"))' },
		planetscale: { expr: 'connect({ url: getEnv("DATABASE_URL") })' }
	},
	postgresql: {
		neon: {
			expr: 'neon(getEnv("DATABASE_URL"))'
		},
		none: { expr: 'new Pool({ connectionString: getEnv("DATABASE_URL") })' }
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
	neon: 'new Pool({ connectionString: getEnv("DATABASE_URL") })',
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

		// MongoDB needs special handling: connect and get database
		if (databaseEngine === 'mongodb') {
			return `
const client = ${hostCfg.expr}
await client.connect()
const db = client.db('database')
`;
		}

		return `
const db = ${hostCfg.expr}
`;
	}

	if (!drizzleDialectSet.has(databaseEngine)) return '';

	// For Drizzle with remote hosts, use remoteDrizzleInit; otherwise use connectionMap
	const isRemoteHost = hostKey !== 'none' && hostKey in remoteDrizzleInit;
	const expr = isRemoteHost 
		? (remoteDrizzleInit[hostKey] ?? engineGroup[hostKey]?.expr)
		: (engineGroup[hostKey]?.expr ?? remoteDrizzleInit[hostKey]);
	if (!expr) return '';

	if (databaseEngine === 'mysql') {
		const mode = databaseHost === 'planetscale' ? 'planetscale' : 'default';

		return `
const pool = ${expr}
const db = drizzle(pool, { schema, mode: '${mode}' })
`;
	}

	if (databaseEngine === 'sqlite') {
		return `
const pool = ${expr}
const db = drizzle(pool, { schema })
`;
	}

	return `
const pool = ${expr}
const db = drizzle(pool, { schema })
`;
};
