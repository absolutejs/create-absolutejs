import { CreateConfiguration } from '../../types';

type GenerateDBHandlersProps = Pick<
	CreateConfiguration,
	'databaseEngine' | 'databaseHost' | 'orm'
> & {
	usesAuth: boolean;
};

type DrizzleOpts = {
	dbTypeImport: string;
	dbType: string;
};

type RawSQLOpts = {
	importLines: string;
	dbType: string;
};

const drizzleAuthTemplate = ({ dbTypeImport, dbType }: DrizzleOpts) => `
import { isValidProviderOption, providers } from 'citra'
import { eq } from 'drizzle-orm'
${dbTypeImport}
import { schema, type SchemaType } from '../../../db/schema'

type UserHandlerProps = {
  authProvider: string
  userIdentity: Record<string, unknown>
  db: ${dbType}<SchemaType>
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
}
`;

const drizzleCountTemplate = ({ dbTypeImport, dbType }: DrizzleOpts) => `
import { eq } from 'drizzle-orm'
${dbTypeImport}
import { schema, type SchemaType } from '../../../db/schema'

type CountHistoryProps = {
  count: number
  db: ${dbType}<SchemaType>
}

export const getCountHistory = async (db: ${dbType}<SchemaType>, uid: number) => {
  const [history] = await db.select().from(schema.countHistory).where(eq(schema.countHistory.uid, uid)).execute()
  return history
}

export const createCountHistory = async ({ count, db }: CountHistoryProps) => {
  const [newHistory] = await db.insert(schema.countHistory).values({ count }).returning()
  return newHistory
}
`;

const libsqlAuthTemplate = ({ importLines, dbType }: RawSQLOpts) => `
${importLines}
import { isValidProviderOption, providers } from 'citra'

type UserHandlerProps = {
  authProvider: string
  userIdentity: Record<string, unknown>
  db: ${dbType}
}

export const getUser = async ({ authProvider, userIdentity, db }: UserHandlerProps) => {
  if (!isValidProviderOption(authProvider)) throw new Error(\`Invalid auth provider: \${authProvider}\`)
  const subject = providers[authProvider].extractSubjectFromIdentity(userIdentity)
  const authSub = \`\${authProvider.toUpperCase()}|\${subject}\`
  const { rows } = await db.execute({
    sql: 'SELECT * FROM users WHERE auth_sub = ? LIMIT 1',
    args: [authSub]
  })
  return rows[0] ?? null
}

export const createUser = async ({ authProvider, userIdentity, db }: UserHandlerProps) => {
  if (!isValidProviderOption(authProvider)) throw new Error(\`Invalid auth provider: \${authProvider}\`)
  const subject = providers[authProvider].extractSubjectFromIdentity(userIdentity)
  const authSub = \`\${authProvider.toUpperCase()}|\${subject}\`
  const { rows } = await db.execute({
    sql: 'INSERT INTO users (auth_sub, metadata) VALUES (?, ?) RETURNING *',
    args: [authSub, JSON.stringify(userIdentity)]
  })
  const newUser = rows[0]
  if (!newUser) throw new Error('Failed to create user')
  return newUser
}
`;

const libsqlCountTemplate = ({ importLines, dbType }: RawSQLOpts) => `
${importLines}

export const getCountHistory = async (db: ${dbType}, uid: number) => {
  const { rows } = await db.execute({
    sql: 'SELECT * FROM count_history WHERE uid = ? LIMIT 1',
    args: [uid]
  })
  return rows[0] ?? null
}

export const createCountHistory = async ({ count, db }: { count: number; db: ${dbType} }) => {
  const { rows } = await db.execute({
    sql: 'INSERT INTO count_history (count) VALUES (?) RETURNING *',
    args: [count]
  })
  return rows[0]
}
`;

const bunSqliteAuthTemplate = `
import { Database } from 'bun:sqlite'
import { isValidProviderOption, providers } from 'citra'

type UserHandlerProps = {
  authProvider: string
  userIdentity: Record<string, unknown>
  db: Database
}

export const getUser = async ({ authProvider, userIdentity, db }: UserHandlerProps) => {
  if (!isValidProviderOption(authProvider)) throw new Error(\`Invalid auth provider: \${authProvider}\`)
  const subject = providers[authProvider].extractSubjectFromIdentity(userIdentity)
  const authSub = \`\${authProvider.toUpperCase()}|\${subject}\`
  const stmt = db.query('SELECT * FROM users WHERE auth_sub = ? LIMIT 1')
  const [user] = stmt.all(authSub)
  return user ?? null
}

export const createUser = async ({ authProvider, userIdentity, db }: UserHandlerProps) => {
  if (!isValidProviderOption(authProvider)) throw new Error(\`Invalid auth provider: \${authProvider}\`)
  const subject = providers[authProvider].extractSubjectFromIdentity(userIdentity)
  const authSub = \`\${authProvider.toUpperCase()}|\${subject}\`
  db.run('INSERT INTO users (auth_sub, metadata) VALUES (?, ?)', [authSub, JSON.stringify(userIdentity)])
  const stmt = db.query('SELECT * FROM users WHERE auth_sub = ? LIMIT 1')
  const [newUser] = stmt.all(authSub)
  if (!newUser) throw new Error('Failed to create user')
  return newUser
}`;

const bunSqliteCountTemplate = `
import { Database } from 'bun:sqlite'

export const getCountHistory = async (db: Database, uid: number) => {
  const stmt = db.query('SELECT * FROM count_history WHERE uid = ? LIMIT 1')
  const [history] = stmt.all(uid)
  return history ?? null
}

export const createCountHistory = async ({ count, db }: { count: number; db: Database }) => {
  db.run('INSERT INTO count_history (count) VALUES (?)', [count])
  const stmt = db.query('SELECT * FROM count_history ORDER BY rowid DESC LIMIT 1')
  const [newHistory] = stmt.all()
  return newHistory
}`;

export const generateDBHandlers = ({
	databaseEngine,
	databaseHost,
	orm,
	usesAuth
}: GenerateDBHandlersProps) => {
	const isDrizzle = orm === 'drizzle';
	const isNeon = databaseHost === 'neon';
	const isTurso = databaseHost === 'turso';
	const isPostgres = databaseEngine === 'postgresql';
	const isSqlite = databaseEngine === 'sqlite';

	if (isDrizzle && isTurso && isSqlite) {
		const opts: DrizzleOpts = {
			dbType: 'LibSQLDatabase',
			dbTypeImport: "import { LibSQLDatabase } from 'drizzle-orm/libsql'"
		};

		return usesAuth
			? drizzleAuthTemplate(opts)
			: drizzleCountTemplate(opts);
	}

	if (isTurso && !isDrizzle && isSqlite) {
		const opts: RawSQLOpts = {
			dbType: 'Client',
			importLines: "import { Client } from '@libsql/client'"
		};

		return usesAuth ? libsqlAuthTemplate(opts) : libsqlCountTemplate(opts);
	}

	if (isDrizzle && isSqlite) {
		const opts: DrizzleOpts = {
			dbType: 'BunSQLiteDatabase',
			dbTypeImport:
				"import { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite'"
		};

		return usesAuth
			? drizzleAuthTemplate(opts)
			: drizzleCountTemplate(opts);
	}

	if (isSqlite) {
		return usesAuth ? bunSqliteAuthTemplate : bunSqliteCountTemplate;
	}

	if (isDrizzle && isNeon) {
		const opts: DrizzleOpts = {
			dbType: 'NeonHttpDatabase',
			dbTypeImport:
				"import { NeonHttpDatabase } from 'drizzle-orm/neon-http'"
		};

		return usesAuth
			? drizzleAuthTemplate(opts)
			: drizzleCountTemplate(opts);
	}

	if (isNeon && !isDrizzle && isPostgres) {
		const neonAuth = `
import { NeonQueryFunction } from '@neondatabase/serverless'

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
}`;
		const neonCount = `
import { NeonQueryFunction } from '@neondatabase/serverless'

export const getCountHistory = async (db: NeonQueryFunction<false, false>, uid: number) => {
  const [history] = await db\`
    SELECT * FROM count_history
    WHERE uid = \${uid}
    LIMIT 1
  \`
  return history ?? null
}

export const createCountHistory = async ({ count, db }: { count: number; db: NeonQueryFunction<false, false> }) => {
  const [newHistory] = await db\`
    INSERT INTO count_history (count)
    VALUES (\${count})
    RETURNING *
  \`
  return newHistory
}`;

		return usesAuth ? neonAuth : neonCount;
	}

	if (isDrizzle && isPostgres) {
		const opts: DrizzleOpts = {
			dbType: 'BunSQLDatabase',
			dbTypeImport: "import { BunSQLDatabase } from 'drizzle-orm/bun-sql'"
		};

		return usesAuth
			? drizzleAuthTemplate(opts)
			: drizzleCountTemplate(opts);
	}

	if (isPostgres) {
		const bunAuth = `
import { SQL } from 'bun'
import { isValidProviderOption, providers } from 'citra'

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
}`;
		const bunCount = `
import { SQL } from 'bun'

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

		return usesAuth ? bunAuth : bunCount;
	}

	return '';
};
