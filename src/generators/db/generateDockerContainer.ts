import { DatabaseEngine } from '../../types';

interface DatabaseTemplate {
	command?: string;
	containerPort: number;
	env: Record<string, string>;
	image: string;
	volumePath: string;
}

const templates: Record<
	Exclude<DatabaseEngine, 'none' | 'sqlite' | undefined>,
	DatabaseTemplate
> = {
	cockroachdb: {
		command: 'start-single-node --insecure',
		containerPort: 26257,
		env: {
			COCKROACH_DATABASE: 'database'
		},
		image: 'cockroachdb/cockroach:latest-v25.3',
		volumePath: '/cockroach/cockroach-data'
	},
	gel: {
		containerPort: 5656,
		env: {
			GEL_SERVER_SECURITY: 'insecure_dev_mode'
		},
		image: 'geldata/gel:latest',
		volumePath: '/var/lib/gel/data'
	},
	mariadb: {
		containerPort: 3306,
		env: {
			MYSQL_DATABASE: 'database',
			MYSQL_ROOT_PASSWORD: 'rootpassword'
		},
		image: 'mariadb:11.4',
		volumePath: '/var/lib/mysql'
	},
	mongodb: {
		containerPort: 27017,
		env: {
			MONGO_INITDB_DATABASE: 'database',
			MONGO_INITDB_ROOT_PASSWORD: 'rootpassword',
			MONGO_INITDB_ROOT_USERNAME: 'root'
		},
		image: 'mongo:7.0',
		volumePath: '/data/db'
	},
	mssql: {
		containerPort: 1433,
		env: {
			ACCEPT_EULA: 'Y',
			MSSQL_SA_PASSWORD: 'SApassword1'
		},
		image: 'mcr.microsoft.com/mssql/server:2022-latest',
		volumePath: '/var/opt/mssql'
	},
	mysql: {
		containerPort: 3306,
		env: {
			MYSQL_DATABASE: 'database',
			MYSQL_ROOT_PASSWORD: 'rootpassword'
		},
		image: 'mysql:8.0',
		volumePath: '/var/lib/mysql'
	},
	postgresql: {
		containerPort: 5432,
		env: {
			POSTGRES_DB: 'database',
			POSTGRES_PASSWORD: 'rootpassword',
			POSTGRES_USER: 'postgres'
		},
		image: 'postgres:15',
		volumePath: '/var/lib/postgresql/data'
	},
	singlestore: {
		containerPort: 3306,
		env: {
			ROOT_PASSWORD: 'rootpassword'
		},
		image: 'ghcr.io/singlestore-labs/singlestoredb-dev', // NOTE: No tag specified due to data persistence
		volumePath: '/data'
	}
};

export const generateDockerContainer = (
	databaseEngine: DatabaseEngine,
	hostPort: number
) => {
	if (
		databaseEngine === undefined ||
		databaseEngine === 'none' ||
		databaseEngine === 'sqlite'
	) {
		throw new Error(
			'Internal type error: Expected a valid local database engine'
		);
	}

	const { command, containerPort, env, image, volumePath } =
		templates[databaseEngine];
	const commandLines = command ? `        command: ${command}` : '';
	const envLines = Object.entries(env)
		.map(([key, value]) => `            ${key}: ${value}`)
		.join('\n');
	const portMapping = `${hostPort}:${containerPort}`;

	return `services:
    db:
        image: ${image}
        restart: always
        environment:
${envLines}
        ports:
            - "${portMapping}"
${commandLines}
        volumes:
            - db_data:${volumePath}

volumes:
    db_data:
`;
};
