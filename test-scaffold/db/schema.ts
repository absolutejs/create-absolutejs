import { pgTable, varchar, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { NeonHttpDatabase } from 'drizzle-orm/neon-http';

export const users = pgTable('users', {
	auth_sub: varchar({ length: 255 }).primaryKey(),
	created_at: timestamp().notNull().defaultNow(),
	metadata: jsonb().$type<Record<string, unknown>>().default({})
});

export const schema = {
	users
};

export type SchemaType = typeof schema;
export type DatabaseType = NeonHttpDatabase<SchemaType>;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
