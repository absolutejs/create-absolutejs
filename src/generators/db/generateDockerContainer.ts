import { DatabaseEngine } from '../../types';

interface DatabaseTemplate {
	image: string;
	port: string;
	env: Record<string, string>;
	volumePath: string;
	command?: string;
}

const templates: Record<
	Exclude<DatabaseEngine, 'none' | 'sqlite' | undefined>,
	DatabaseTemplate
> = {
	cockroachdb: {
		command: 'start-single-node --insecure',
		env: {
			COCKROACH_DATABASE: 'database'
		},
		image: 'cockroachdb/cockroach:latest-v25.3',
		port: '26257:26257',
		volumePath: '/cockroach/cockroach-data'
	},
	gel: {
		env: {
			GEL_SERVER_SECURITY: 'insecure_dev_mode'
		},
		image: 'geldata/gel:latest',
		port: '5656:5656',
		volumePath: '/var/lib/gel/data'
	},
	mariadb: {
		env: {
			MYSQL_DATABASE: 'database',
			MYSQL_PASSWORD: 'userpassword',
			MYSQL_ROOT_PASSWORD: 'rootpassword',
			MYSQL_USER: 'user'
		},
		image: 'mariadb:11.4',
		port: '3306:3306',
		volumePath: '/var/lib/mysql'
	},
	mongodb: {
		env: {
			MONGO_INITDB_DATABASE: 'database',
			MONGO_INITDB_ROOT_PASSWORD: 'password',
			MONGO_INITDB_ROOT_USERNAME: 'user'
		},
		image: 'mongo:7.0',
		port: '27017:27017',
		volumePath: '/data/db'
	},
	mssql: {
		env: {
			ACCEPT_EULA: 'Y',
			MSSQL_SA_PASSWORD: 'SApassword1'
		},
		image: 'mcr.microsoft.com/mssql/server:2022-latest',
		port: '1433:1433',
		volumePath: '/var/opt/mssql'
	},
	mysql: {
		env: {
			MYSQL_DATABASE: 'database',
			MYSQL_PASSWORD: 'userpassword',
			MYSQL_ROOT_PASSWORD: 'rootpassword',
			MYSQL_USER: 'user'
		},
		image: 'mysql:8.0',
		port: '3306:3306',
		volumePath: '/var/lib/mysql'
	},
	postgresql: {
		env: {
			POSTGRES_DB: 'database',
			POSTGRES_PASSWORD: 'password',
			POSTGRES_USER: 'user'
		},
		image: 'postgres:15',
		port: '5432:5432',
		volumePath: '/var/lib/postgresql/data'
	},
	singlestore: {
		env: {
			ROOT_PASSWORD: 'password'
		},
		image: 'ghcr.io/singlestore-labs/singlestoredb-dev', // NOTE: No tag specified due to data persistence
		port: '3306:3306',
		volumePath: '/data'
	}
};

export const generateDockerContainer = (databaseEngine: DatabaseEngine) => {
	if (
		databaseEngine === undefined ||
		databaseEngine === 'none' ||
		databaseEngine === 'sqlite'
	) {
		throw new Error(
			'Internal type error: Expected a valid local database engine'
		);
	}

	const { image, port, env, volumePath, command } = templates[databaseEngine];
	const commandLines = command ? `        command: ${command}` : '';
	const envLines = Object.entries(env)
		.map(([key, value]) => `            ${key}: ${value}`)
		.join('\n');

	return `services:
    db:
        image: ${image}
        restart: always
        environment:
${envLines}
        ports:
            - "${port}"
${commandLines}
        volumes:
            - db_data:${volumePath}

volumes:
    db_data:
`;
};
