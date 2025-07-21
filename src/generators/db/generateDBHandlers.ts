import { CreateConfiguration } from '../../types';

type GenerateDBHandlersProps = Pick<
	CreateConfiguration,
	'databaseEngine' | 'databaseHost' | 'orm'
> & {
	usesAuth: boolean;
};

export const generateDBHandlers = ({
	databaseEngine,
	databaseHost,
	orm,
	usesAuth
}: GenerateDBHandlersProps) => {
	const isDrizzle = orm === 'drizzle';
	const isNeon = databaseHost === 'neon';
	const isPostgres = databaseEngine === 'postgresql';

	if (isDrizzle && isNeon) {
		return usesAuth
			? `import { isValidProviderOption, providers } from 'citra'
import { eq } from 'drizzle-orm'
import { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { schema, type SchemaType } from '../../../db/schema'

type UserHandlerProps = {
  authProvider: string
  userIdentity: Record<string, unknown>
  db: NeonHttpDatabase<SchemaType>
}

export const getUser = async ({ authProvider, userIdentity, db }: UserHandlerProps) => {
  if (!isValidProviderOption(authProvider)) throw new Error(\`Invalid auth provider: \${authProvider}\`)
  const subject = providers[authProvider].extractSubjectFromIdentity(userIdentity)
  const authSub = \`\${authProvider.toUpperCase()}|\${subject}\`
  const [user] = await db.select().from(schema.users).where(eq(schema.users.auth_sub, authSub)).execute()
  return user
}

export const createUser = async ({ authProvider, userIdentity, db }: UserHandlerProps) => {
  if (!isValidProviderOption(authProvider)) throw new Error(\`Invalid auth provider: \${authProvider}\`)
  const subject = providers[authProvider].extractSubjectFromIdentity(userIdentity)
  const authSub = \`\${authProvider.toUpperCase()}|\${subject}\`
  const [newUser] = await db.insert(schema.users).values({ auth_sub: authSub, metadata: userIdentity }).returning()
  if (!newUser) throw new Error('Failed to create user')
  return newUser
}`
			: `import { eq } from 'drizzle-orm'
import { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { schema, type SchemaType, type NewCountHistory } from '../../../db/schema'

type CountHistoryProps = {
  count: number
  db: NeonHttpDatabase<SchemaType>
}

export const getCountHistory = async (db: NeonHttpDatabase<SchemaType>, uid: number) => {
  const [history] = await db.select().from(schema.countHistory).where(eq(schema.countHistory.uid, uid)).execute()
  return history
}

export const createCountHistory = async ({ count, db }: CountHistoryProps) => {
  const [newHistory] = await db.insert(schema.countHistory).values({ count }).returning()
  return newHistory
}`;
	}

	if (isNeon && !isDrizzle && isPostgres) {
		return usesAuth
			? `import { NeonQueryFunction } from '@neondatabase/serverless';
import { isValidProviderOption, providers } from 'citra'

type UserHandlerProps = {
  authProvider: string
  userIdentity: Record<string, unknown>
  db: NeonQueryFunction<false, false>
}

export const getUser = async ({ authProvider, userIdentity, db }: UserHandlerProps) => {
  if (!isValidProviderOption(authProvider)) throw new Error(\`Invalid auth provider: \${authProvider}\`)
  const subject = providers[authProvider].extractSubjectFromIdentity(userIdentity)
  const authSub = \`\${authProvider.toUpperCase()}|\${subject}\`
  const [user] = await db\`
    SELECT * FROM users
    WHERE auth_sub = \${authSub}
    LIMIT 1
  \`
  return user ?? null
}

export const createUser = async ({ authProvider, userIdentity, db }: UserHandlerProps) => {
  if (!isValidProviderOption(authProvider)) throw new Error(\`Invalid auth provider: \${authProvider}\`)
  const subject = providers[authProvider].extractSubjectFromIdentity(userIdentity)
  const authSub = \`\${authProvider.toUpperCase()}|\${subject}\`
  const [newUser] = await db\`
    INSERT INTO users (auth_sub, metadata)
    VALUES (\${authSub}, \${userIdentity})
    RETURNING *
  \`
  if (!newUser) throw new Error('Failed to create user')
  return newUser
}`
			: `import { neon } from '@neondatabase/serverless'

export const getCountHistory = async (db: ReturnType<typeof neon>, uid: number) => {
  const [history] = await db\`
    SELECT * FROM count_history
    WHERE uid = \${uid}
    LIMIT 1
  \`
  return history ?? null
}

export const createCountHistory = async ({ count, db }: { count: number; db: ReturnType<typeof neon> }) => {
  const [newHistory] = await db\`
    INSERT INTO count_history (count)
    VALUES (\${count})
    RETURNING *
  \`
  return newHistory
}`;
	}

	if (isDrizzle && isPostgres) {
		return usesAuth
			? `import { isValidProviderOption, providers } from 'citra'
import { eq } from 'drizzle-orm'
import { BunSQLDatabase } from 'drizzle-orm/bun-sql'
import { schema, type SchemaType } from '../../../db/schema'

type UserHandlerProps = {
  authProvider: string
  userIdentity: Record<string, unknown>
  db: BunSQLDatabase<SchemaType>
}

export const getUser = async ({ authProvider, userIdentity, db }: UserHandlerProps) => {
  if (!isValidProviderOption(authProvider)) throw new Error(\`Invalid auth provider: \${authProvider}\`)
  const subject = providers[authProvider].extractSubjectFromIdentity(userIdentity)
  const authSub = \`\${authProvider.toUpperCase()}|\${subject}\`
  const [user] = await db.select().from(schema.users).where(eq(schema.users.auth_sub, authSub)).execute()
  return user
}

export const createUser = async ({ authProvider, userIdentity, db }: UserHandlerProps) => {
  if (!isValidProviderOption(authProvider)) throw new Error(\`Invalid auth provider: \${authProvider}\`)
  const subject = providers[authProvider].extractSubjectFromIdentity(userIdentity)
  const authSub = \`\${authProvider.toUpperCase()}|\${subject}\`
  const [newUser] = await db.insert(schema.users).values({ auth_sub: authSub, metadata: userIdentity }).returning()
  if (!newUser) throw new Error('Failed to create user')
  return newUser
}`
			: `import { eq } from 'drizzle-orm'
import { BunSQLDatabase } from 'drizzle-orm/bun-sql'
import { schema, type SchemaType, type NewCountHistory } from '../../../db/schema'

type CountHistoryProps = {
  count: number
  db: BunSQLDatabase<SchemaType>
}

export const getCountHistory = async (db: BunSQLDatabase<SchemaType>, uid: number) => {
  const [history] = await db.select().from(schema.countHistory).where(eq(schema.countHistory.uid, uid)).execute()
  return history
}

export const createCountHistory = async ({ count, db }: CountHistoryProps) => {
  const [newHistory] = await db.insert(schema.countHistory).values({ count }).returning()
  return newHistory
}`;
	}

	if (isPostgres) {
		return usesAuth
			? `import { isValidProviderOption, providers } from 'citra'
import { SQL } from 'bun'

type UserHandlerProps = {
  authProvider: string
  userIdentity: Record<string, unknown>
  db: SQL
}

export const getUser = async ({ authProvider, userIdentity, db }: UserHandlerProps) => {
  if (!isValidProviderOption(authProvider)) throw new Error(\`Invalid auth provider: \${authProvider}\`)
  const subject = providers[authProvider].extractSubjectFromIdentity(userIdentity)
  const authSub = \`\${authProvider.toUpperCase()}|\${subject}\`
  const [user] = await db\`
    SELECT * FROM users
    WHERE auth_sub = \${authSub}
    LIMIT 1
  \`
  return user ?? null
}

export const createUser = async ({ authProvider, userIdentity, db }: UserHandlerProps) => {
  if (!isValidProviderOption(authProvider)) throw new Error(\`Invalid auth provider: \${authProvider}\`)
  const subject = providers[authProvider].extractSubjectFromIdentity(userIdentity)
  const authSub = \`\${authProvider.toUpperCase()}|\${subject}\`
  const [newUser] = await db\`
    INSERT INTO users (auth_sub, metadata)
    VALUES (\${authSub}, \${userIdentity})
    RETURNING *
  \`
  if (!newUser) throw new Error('Failed to create user')
  return newUser
}`
			: `import { SQL } from 'bun'

export const getCountHistory = async (db: SQL, uid: number) => {
  const [history] = await db\`
    SELECT * FROM count_history
    WHERE uid = \${uid}
    LIMIT 1
  \`
  return history ?? null
}

export const createCountHistory = async ({ count, db }: { count: number; db: SQL }) => {
  const [newHistory] = await db\`
    INSERT INTO count_history (count)
    VALUES (\${count})
    RETURNING *
  \`
  return newHistory
}`;
	}

	return '';
};
