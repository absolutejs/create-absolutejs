export const generateDBHandlers = (usesAuth: boolean) =>
	usesAuth
		? `import { DatabaseType, NewUser, schema } from '../../../db/schema';
import { eq } from 'drizzle-orm';

export const getUser = async (db: DatabaseType, auth_sub: string) => {
	const [user] = await db
		.select()
		.from(schema.users)
		.where(eq(schema.users.auth_sub, auth_sub));

	return user;
};

export const createUser = async ({ auth_sub, db, metadata }: NewUser & { db: DatabaseType }) => {
	const [newUser] = await db
		.insert(schema.users)
		.values({ auth_sub, metadata })
		.returning();

	return newUser;
};`
		: `import { eq } from 'drizzle-orm';
import { DatabaseType, NewCountHistory, schema } from '../../../db/schema';

export const getCountHistory = async (db: DatabaseType, uid: number) => {
	const [history] = await db
		.select()
		.from(schema.countHistory)
		.where(eq(schema.countHistory.uid, uid));

	return history;
};

export const createCountHistory = async ({ count, db }: NewCountHistory & { db: DatabaseType }) => {
	const [newHistory] = await db
		.insert(schema.countHistory)
		.values({ count })
		.returning();

	return newHistory;
};`;
