import type { Change } from '@absolutejs/changelog';
import type * as Api from '../../src/index';

export const change: Change<typeof Api> = {
	kind: 'added',
	summary:
		'Scaffold Prisma for every Prisma database (PostgreSQL, Neon, PlanetScale, CockroachDB, MySQL, MariaDB, SQLite, Turso, SQL Server on Prisma 7.10 driver adapters; MongoDB on Prisma 6.19.3) with a committed initial migration, typed handlers and prisma generate / db:migrate scripts'
};
