import { availableDrizzleDialects } from '../data';
import { isDrizzleDialect } from '../typeGuards';
import type { DatabaseEngine, DatabaseHost, ORM } from '../types';

type DatabaseSelection = {
	databaseEngine: DatabaseEngine;
	databaseHost: DatabaseHost;
	orm: ORM;
};

const hostEngines = {
	neon: { engines: ['postgresql'], label: 'Neon' },
	none: undefined,
	planetscale: { engines: ['postgresql', 'mysql'], label: 'PlanetScale' },
	turso: { engines: ['sqlite'], label: 'Turso' }
} as const;

const formatEngines = (engines: readonly string[]) =>
	engines.map((engine) => `"${engine}"`).join(' or ');

/* Every engine/host/ORM combination the CLI accepts must scaffold working code,
   so unsupported ones are refused here, before anything is written. Turso only
   serves SQLite, so choosing it without an engine selects SQLite. */
export const validateDatabaseSelection = ({
	databaseEngine,
	databaseHost,
	orm
}: DatabaseSelection) => {
	const errors: string[] = [];
	const hasEngine = databaseEngine !== undefined && databaseEngine !== 'none';
	const resolvedEngine: DatabaseEngine =
		databaseHost === 'turso' && !hasEngine ? 'sqlite' : databaseEngine;

	if (orm === 'drizzle' && databaseEngine === 'gel') {
		errors.push(
			'Drizzle ORM 1.0 does not support Gel. Use "--orm none" with "--db gel".'
		);
	} else if (
		orm === 'drizzle' &&
		hasEngine &&
		!isDrizzleDialect(databaseEngine)
	) {
		errors.push(
			`Invalid database engine for Drizzle ORM: "${databaseEngine}". Expected: [ ${availableDrizzleDialects.join(', ')} ]`
		);
	}

	const host =
		databaseHost === undefined ? undefined : hostEngines[databaseHost];
	const acceptsEngine = host?.engines.some(
		(engine) => engine === resolvedEngine
	);
	if (host !== undefined && !acceptsEngine) {
		errors.push(
			`Invalid database engine for ${host.label}: "${resolvedEngine}". Expected: ${formatEngines(host.engines)}.`
		);
	}

	return { databaseEngine: resolvedEngine, errors };
};
