import net from 'net';
import type { DatabaseEngine } from '../types';

const DEFAULT_PORTS: Record<
	Exclude<DatabaseEngine, 'none' | 'sqlite' | undefined>,
	number
> = {
	cockroachdb: 26257,
	gel: 5656,
	mariadb: 3306,
	mongodb: 27017,
	mssql: 1433,
	mysql: 3306,
	postgresql: 5432,
	singlestore: 3306
};

const MAX_PORT_ATTEMPTS = 100;

const PORT_CHECK_TIMEOUT_MS = 1000;

/** Try to connect to port. If connect succeeds, port is in use. If ECONNREFUSED, port is free. */
const isPortInUse = (port: number) =>
	new Promise<boolean>((resolve) => {
		let settled = false;
		const finish = (inUse: boolean) => {
			if (settled) return;
			settled = true;
			socket.destroy();
			resolve(inUse);
		};
		const socket = new net.Socket();
		socket.setTimeout(PORT_CHECK_TIMEOUT_MS, () => finish(true));
		socket.once('connect', () => finish(true));
		socket.once('error', (err: { code?: string }) =>
			finish(err.code !== 'ECONNREFUSED')
		);
		socket.connect(port, '127.0.0.1');
	});

const findAvailablePortRec = async (port: number, attempt: number) => {
	if (attempt >= MAX_PORT_ATTEMPTS) {
		throw new Error(
			`No available port found after ${MAX_PORT_ATTEMPTS} attempts starting from ${port - attempt}`
		);
	}
	const inUse = await isPortInUse(port);
	if (!inUse) return port;

	return findAvailablePortRec(port + 1, attempt + 1);
};

/** Resolves an available host port for the given database engine. Cross-platform via Node net. */
export const resolveDatabasePort = async (databaseEngine: DatabaseEngine) => {
	if (
		databaseEngine === undefined ||
		databaseEngine === 'none' ||
		databaseEngine === 'sqlite'
	) {
		return undefined;
	}
	const defaultPort = DEFAULT_PORTS[databaseEngine];

	return findAvailablePortRec(defaultPort, 0);
};
