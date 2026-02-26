import { availableDrizzleDialects, availablePrismaDialects } from '../../data';
import type { CreateConfiguration } from '../../types';

type DBExpr = { expr: string };

const connectionMap: Record<string, Record<string, DBExpr>> = {
	cockroachdb: {
		none: { expr: 'new SQL(getEnv("DATABASE_URL"))' }
	},
	gel: {
		none: { expr: 'createClient(getEnv("DATABASE_URL"))' }
	},
	mariadb: {
		none: { expr: 'new SQL(getEnv("DATABASE_URL"))' }
	},
	mongodb: {
		none: { expr: 'new MongoClient(getEnv("DATABASE_URL"))' }
	},
	mssql: {
		none: { expr: 'await connect(getEnv("DATABASE_URL"))' }
	},
	mysql: {
		none: { expr: 'new SQL(getEnv("DATABASE_URL"))' },
		planetscale: { expr: 'new Client({ url: getEnv("DATABASE_URL") })' }
	},
	postgresql: {
		neon: {
			expr: 'neon(getEnv("DATABASE_URL"));'
		},
		none: { expr: 'new SQL(getEnv("DATABASE_URL"))' },
		planetscale: {
			expr: 'new Pool({ connectionString: getEnv("DATABASE_URL") })'
		}
	},
	singlestore: {
		none: { expr: 'createPool(getEnv("DATABASE_URL"))' }
	},
	sqlite: {
		none: { expr: 'new Database("db/database.sqlite")' },
		turso: { expr: 'createClient({ url: getEnv("DATABASE_URL") })' }
	}
};

const remoteDrizzleInit: Record<string, string> = {
	neon: 'neon(getEnv("DATABASE_URL"));',
	planetscale: 'new Client({ url: getEnv("DATABASE_URL") })',
	turso: 'createClient({ url: getEnv("DATABASE_URL") })'
};

const drizzleDialectSet = new Set<string>([...availableDrizzleDialects]);
const prismaDialectSet = new Set<string>([...availablePrismaDialects]);

type GenerateDBBlockProps = Pick<
	CreateConfiguration,
	'databaseDirectory' | 'databaseEngine' | 'orm' | 'databaseHost'
>;

const defaultDbDir = 'db';

export const generateDBBlock = ({
	databaseDirectory = defaultDbDir,
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

	if (orm !== 'drizzle' && orm !== 'prisma') {
		const hostCfg = engineGroup[hostKey];

		if (!hostCfg) return '';
		const expr = hostCfg.expr.replace('db/', `${databaseDirectory}/`);

		return `const db = ${expr}`;
	}

	if (orm === 'drizzle') {
		if (!drizzleDialectSet.has(databaseEngine)) return '';

		let expr = engineGroup[hostKey]?.expr ?? remoteDrizzleInit[hostKey];
		if (!expr) return '';
		expr = expr.replace('db/', `${databaseDirectory}/`);

		if (
			(databaseEngine === 'mysql' || databaseEngine === 'mariadb') &&
			databaseHost !== 'planetscale'
		) {
			return `
const pool = createPool(getEnv("DATABASE_URL"))
const db = drizzle(pool, { schema, mode: 'default' })
`;
		}

		if (databaseEngine === 'mssql' && hostKey === 'none') {
			return `
const pool = await connect(getEnv("DATABASE_URL"))
const db = drizzle({ client: pool }, { schema })
`;
		}

		if (databaseEngine === 'postgresql' && databaseHost === 'neon') {
			return `
const sql = neon(getEnv('DATABASE_URL'));
const db = drizzle(sql, { schema });
`;
		}

		const mysqlMode =
			databaseHost === 'planetscale' ? 'planetscale' : 'default';

		return `
const pool = ${expr}
const db = drizzle(pool, { schema, mode: '${mysqlMode}' })
`;
	}

	if (orm === 'prisma') {
		if (!prismaDialectSet.has(databaseEngine)) return '';

		return `const prisma = (await import('../../${databaseDirectory}/client')).default
const db = prisma`;
	}

	return '';
};
