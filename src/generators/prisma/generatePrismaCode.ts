import type { AuthOption } from '../../types';
import type { PrismaTarget } from './prismaTargets';

/* The generated client's entry, as imported from src/backend/server.ts,
   src/backend/handlers/* and src/types/* (see prismaClientDirectory). */
const clientFromBackend = '../generated/prisma/client';
const clientFromTypes = '../generated/prisma/client';

/* src/types/databaseTypes.ts. Rows are the client's own model types; the
   user's metadata is narrowed to the identity shape the auth flow stores. */
export const generatePrismaDatabaseTypes = (
	authOption: AuthOption,
	{ provider }: PrismaTarget
) => {
	if (authOption === 'abs')
		return `import type { PrismaClient } from '${clientFromTypes}';
import type { UserIdentity } from './userIdentity';

export type DatabaseType = PrismaClient;

export type User = {
	auth_sub: string;
	created_at: Date;
	metadata: UserIdentity;
};

export type NewUser = {
	auth_sub: string;
	metadata?: UserIdentity;
};
`;

	const countHistory =
		provider === 'mongodb'
			? `/* The document's ObjectId stays internal; the API is keyed by uid. */
export type CountHistory = Omit<CountHistoryModel, 'id'>;`
			: 'export type CountHistory = CountHistoryModel;';

	return `import type {
	CountHistory as CountHistoryModel,
	PrismaClient
} from '${clientFromTypes}';

export type DatabaseType = PrismaClient;

${countHistory}

export type NewCountHistory = {
	count: number;
};
`;
};
/* Prisma 7 queries through the driver adapter; Prisma 6 (MongoDB) connects
   with its own engine, given the URL explicitly so a missing one fails fast. */
export const generatePrismaDBBlock = ({ adapter }: PrismaTarget) =>
	adapter
		? `const db = new PrismaClient({ adapter: ${adapter.expression} })`
		: `const db = new PrismaClient({ datasourceUrl: getEnv('DATABASE_URL') })`;
/* server.ts imports for the Prisma client and its driver adapter. */
export const getPrismaServerImports = ({ adapter }: PrismaTarget) => [
	`import { PrismaClient } from '${clientFromBackend}'`,
	`import { getEnv } from '@absolutejs/absolute'`,
	...(adapter
		? [`import { ${adapter.className} } from '${adapter.packageName}'`]
		: []),
	...(adapter?.expression.includes('env.')
		? [`import { env } from 'bun'`]
		: [])
];

/* Prisma queries return a lazy PrismaPromise that only runs when awaited;
   Elysia serializes a returned non-Promise object as-is. Every handler is
   async and awaits, so routes always receive a real Promise of the row. */
const countHistoryHandlers = ({ provider }: PrismaTarget) =>
	provider === 'mongodb'
		? `import type { CountHistory, DatabaseType } from '../../types/databaseTypes';

export const getCountHistory = async (
	db: DatabaseType,
	uid: number
): Promise<CountHistory | null> =>
	await db.countHistory.findUnique({ omit: { id: true }, where: { uid } });

/* MongoDB has no autoincrement: the next uid comes from an atomic increment
   on a counter document. */
export const createCountHistory = async (
	db: DatabaseType,
	count: number
): Promise<CountHistory> => {
	const { value: uid } = await db.counter.upsert({
		create: { id: 'count_history', value: 1 },
		update: { value: { increment: 1 } },
		where: { id: 'count_history' }
	});

	return await db.countHistory.create({
		data: { count, uid },
		omit: { id: true }
	});
};
`
		: `import type { CountHistory, DatabaseType } from '../../types/databaseTypes';

export const getCountHistory = async (
	db: DatabaseType,
	uid: number
): Promise<CountHistory | null> =>
	await db.countHistory.findUnique({ where: { uid } });

export const createCountHistory = async (
	db: DatabaseType,
	count: number
): Promise<CountHistory> => await db.countHistory.create({ data: { count } });
`;

/* Json columns hand back Prisma's JsonValue; SQL Server stores the metadata as
   JSON text. Either way it is validated back into a UserIdentity. */
const userHandlers = ({ supportsJson }: PrismaTarget) => {
	const readMetadata = supportsJson ? 'metadata' : 'JSON.parse(metadata)';
	const writeMetadata = supportsJson
		? 'metadata'
		: 'metadata: JSON.stringify(metadata)';

	return `import type { DatabaseType, NewUser, User } from '../../types/databaseTypes';
import { parseUserIdentity } from '../../types/userIdentity';

type UserRow = {
	auth_sub: string;
	created_at: Date;
	metadata: ${supportsJson ? 'unknown' : 'string'};
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const toUser = ({ auth_sub, created_at, metadata }: UserRow): User => {
	const identity: unknown = ${readMetadata};

	return {
		auth_sub,
		created_at,
		metadata: isRecord(identity) ? parseUserIdentity(identity) : {}
	};
};

export const getUser = async (
	db: DatabaseType,
	authSub: string
): Promise<User | null> => {
	const user = await db.user.findUnique({ where: { auth_sub: authSub } });

	return user ? toUser(user) : null;
};

export const createUser = async (
	db: DatabaseType,
	{ auth_sub, metadata = {} }: NewUser
): Promise<User> =>
	toUser(await db.user.create({ data: { auth_sub, ${writeMetadata} } }));
`;
};

/* src/backend/handlers/{countHistory,user}Handlers.ts */
export const generatePrismaHandlers = (
	authOption: AuthOption,
	target: PrismaTarget
) =>
	authOption === 'abs' ? userHandlers(target) : countHistoryHandlers(target);
