import type { Change } from '@absolutejs/changelog';
import type * as Api from '../../src/index';

export const change: Change<typeof Api> = {
	kind: 'added',
	summary:
		'Scaffold Drizzle for every Drizzle 1.0 dialect (PostgreSQL, MySQL, MariaDB, SQLite, Turso/libSQL, SingleStore, SQL Server, CockroachDB) with a committed initial migration and db:generate / db:migrate scripts'
};
