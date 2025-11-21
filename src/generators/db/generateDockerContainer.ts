import { DatabaseEngine } from '../../types';

const templates = {
	cockroachdb: {
		env: {
			COCKROACH_INSECURE: 'true'
		},
		image: 'cockroachdb/cockroach:v24.1.0',
		port: '26257:26257',
		volumePath: '/cockroach/cockroach-data'
	},
	gel: {
		env: {
			GEL_DB: 'database',
			GEL_PASSWORD: 'password',
			GEL_USER: 'user'
		},
		image: 'gel:latest',
		port: '4000:4000',
		volumePath: '/var/lib/gel'
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
		image: 'singlestore/cluster-in-a-box:latest',
		port: '3306:3306',
		volumePath: '/var/lib/memsql'
	}
} as const;

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

	const { image, port, env, volumePath } = templates[databaseEngine];
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
        volumes:
            - db_data:${volumePath}

volumes:
    db_data:
`;
};
