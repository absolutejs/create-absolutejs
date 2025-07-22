type DrizzleOpts = { dbType: string; dbTypeImport: string };

const drizzleAuthTemplate = ({ dbType, dbTypeImport }: DrizzleOpts) => `
import { isValidProviderOption, providers } from 'citra'
import { eq } from 'drizzle-orm'
${dbTypeImport}
import { schema, type SchemaType } from '../../../db/schema'

type UserHandlerProps = {
  authProvider: string
  db: ${dbType}<SchemaType>
  userIdentity: Record<string, unknown>
}

export const getUser = async ({ authProvider, db, userIdentity }: UserHandlerProps) => {
  if (!isValidProviderOption(authProvider)) throw new Error(\`Invalid auth provider: \${authProvider}\`)
  const subject = providers[authProvider].extractSubjectFromIdentity(userIdentity)
  const authSub = \`\${authProvider.toUpperCase()}|\${subject}\`
  const [user] = await db.select().from(schema.users).where(eq(schema.users.auth_sub, authSub)).execute()
  return user
}

export const createUser = async ({ authProvider, db, userIdentity }: UserHandlerProps) => {
  if (!isValidProviderOption(authProvider)) throw new Error(\`Invalid auth provider: \${authProvider}\`)
  const subject = providers[authProvider].extractSubjectFromIdentity(userIdentity)
  const authSub = \`\${authProvider.toUpperCase()}|\${subject}\`
  const [newUser] = await db.insert(schema.users).values({ auth_sub: authSub, metadata: userIdentity }).returning()
  if (!newUser) throw new Error('Failed to create user')
  return newUser
}
`;

const drizzleCountTemplate = ({ dbType, dbTypeImport }: DrizzleOpts) => `
import { eq } from 'drizzle-orm'
${dbTypeImport}
import { schema, type SchemaType } from '../../../db/schema'

export const getCountHistory = async (db: ${dbType}<SchemaType>, uid: number) => {
  const [history] = await db.select().from(schema.countHistory).where(eq(schema.countHistory.uid, uid)).execute()
  return history
}

export const createCountHistory = async (db: ${dbType}<SchemaType>, count: number) => {
  const [newHistory] = await db.insert(schema.countHistory).values({ count }).returning()
  return newHistory
}
`;

const libsqlAuthTemplate = `
import { Client } from '@libsql/client'
import { isValidProviderOption, providers } from 'citra'

type UserHandlerProps = {
  authProvider: string
  db: Client
  userIdentity: Record<string, unknown>
}

export const getUser = async ({ authProvider, db, userIdentity }: UserHandlerProps) => {
  if (!isValidProviderOption(authProvider)) throw new Error(\`Invalid auth provider: \${authProvider}\`)
  const subject = providers[authProvider].extractSubjectFromIdentity(userIdentity)
  const authSub = \`\${authProvider.toUpperCase()}|\${subject}\`
  const { rows } = await db.execute({
    sql: 'SELECT * FROM users WHERE auth_sub = ? LIMIT 1',
    args: [authSub]
  })
  return rows[0] ?? null
}

export const createUser = async ({ authProvider, db, userIdentity }: UserHandlerProps) => {
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

const libsqlCountTemplate = `
import { Client } from '@libsql/client'

export const getCountHistory = async (db: Client, uid: number) => {
  const { rows } = await db.execute({
    sql: 'SELECT * FROM count_history WHERE uid = ? LIMIT 1',
    args: [uid]
  })
  return rows[0] ?? null
}

export const createCountHistory = async (db: Client, count: number) => {
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
  db: Database
  userIdentity: Record<string, unknown>
}

export const getUser = async ({ authProvider, db, userIdentity }: UserHandlerProps) => {
  if (!isValidProviderOption(authProvider)) throw new Error(\`Invalid auth provider: \${authProvider}\`)
  const subject = providers[authProvider].extractSubjectFromIdentity(userIdentity)
  const authSub = \`\${authProvider.toUpperCase()}|\${subject}\`
  const stmt = db.query('SELECT * FROM users WHERE auth_sub = ? LIMIT 1')
  const [user] = stmt.all(authSub)
  return user ?? null
}

export const createUser = async ({ authProvider, db, userIdentity }: UserHandlerProps) => {
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

export const createCountHistory = async (db: Database, count: number) => {
  db.run('INSERT INTO count_history (count) VALUES (?)', [count])
  const stmt = db.query('SELECT * FROM count_history ORDER BY rowid DESC LIMIT 1')
  const [newHistory] = stmt.all()
  return newHistory
}`;

const neonAuth = `
import { NeonQueryFunction } from '@neondatabase/serverless'
import { isValidProviderOption, providers } from 'citra'

type UserHandlerProps = {
  authProvider: string
  db: NeonQueryFunction<false, false>
  userIdentity: Record<string, unknown>
}

export const getUser = async ({ authProvider, db, userIdentity }: UserHandlerProps) => {
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

export const createUser = async ({ authProvider, db, userIdentity }: UserHandlerProps) => {
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

export const createCountHistory = async (db: NeonQueryFunction<false, false>, count: number) => {
  const [newHistory] = await db\`
    INSERT INTO count_history (count)
    VALUES (\${count})
    RETURNING *
  \`
  return newHistory
}`;

const bunAuth = `
import { SQL } from 'bun'
import { isValidProviderOption, providers } from 'citra'

type UserHandlerProps = {
  authProvider: string
  db: SQL
  userIdentity: Record<string, unknown>
}

export const getUser = async ({ authProvider, db, userIdentity }: UserHandlerProps) => {
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

export const createUser = async ({ authProvider, db, userIdentity }: UserHandlerProps) => {
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

export const createCountHistory = async (db: SQL, count: number) => {
  const [newHistory] = await db\`
    INSERT INTO count_history (count)
    VALUES (\${count})
    RETURNING *
  \`
  return newHistory
}`;

export const dbHandlerTemplates = {
	'postgresql:drizzle:local:auth': drizzleAuthTemplate({
		dbType: 'BunSQLDatabase',
		dbTypeImport: "import { BunSQLDatabase } from 'drizzle-orm/bun-sql'"
	}),
	'postgresql:drizzle:local:count': drizzleCountTemplate({
		dbType: 'BunSQLDatabase',
		dbTypeImport: "import { BunSQLDatabase } from 'drizzle-orm/bun-sql'"
	}),
	'postgresql:drizzle:neon:auth': drizzleAuthTemplate({
		dbType: 'NeonHttpDatabase',
		dbTypeImport: "import { NeonHttpDatabase } from 'drizzle-orm/neon-http'"
	}),
	'postgresql:drizzle:neon:count': drizzleCountTemplate({
		dbType: 'NeonHttpDatabase',
		dbTypeImport: "import { NeonHttpDatabase } from 'drizzle-orm/neon-http'"
	}),
	'postgresql:sql:local:auth': bunAuth,
	'postgresql:sql:local:count': bunCount,
	'postgresql:sql:neon:auth': neonAuth,
	'postgresql:sql:neon:count': neonCount,
	'sqlite:drizzle:local:auth': drizzleAuthTemplate({
		dbType: 'BunSQLiteDatabase',
		dbTypeImport:
			"import { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite'"
	}),
	'sqlite:drizzle:local:count': drizzleCountTemplate({
		dbType: 'BunSQLiteDatabase',
		dbTypeImport:
			"import { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite'"
	}),
	'sqlite:drizzle:turso:auth': drizzleAuthTemplate({
		dbType: 'LibSQLDatabase',
		dbTypeImport: "import { LibSQLDatabase } from 'drizzle-orm/libsql'"
	}),
	'sqlite:drizzle:turso:count': drizzleCountTemplate({
		dbType: 'LibSQLDatabase',
		dbTypeImport: "import { LibSQLDatabase } from 'drizzle-orm/libsql'"
	}),
	'sqlite:sql:local:auth': bunSqliteAuthTemplate,
	'sqlite:sql:local:count': bunSqliteCountTemplate,
	'sqlite:sql:turso:auth': libsqlAuthTemplate,
	'sqlite:sql:turso:count': libsqlCountTemplate
} as const;
