import { pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';

const users = pgTable('users', {
	auth_sub: varchar('auth_sub', { length: 255 }).primaryKey(),
	created_at: timestamp('created_at').notNull().defaultNow(),
	email: varchar('email', { length: 255 }).notNull().unique(),
	family_name: varchar('family_name', { length: 255 }),
	given_name: varchar('given_name', { length: 255 }),
	picture: varchar('picture', { length: 255 })
});

export const schema = {
	users
};

// Type Definitions
export type SchemaType = typeof schema;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
