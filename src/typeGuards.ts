import {
	availableDatabaseEngines,
	availableDatabaseHosts,
	availableDrizzleDialects,
	availablePrismaDialects,
	frontendLabels
} from './data';
import type {
	AuthOption,
	AvailableDrizzleDialect,
	CodeQualityTool,
	DatabaseEngine,
	DatabaseHost,
	Frontend,
	ORM
} from './types';

export const isValidAuthOption = (
	value: string | undefined
): value is AuthOption =>
	value === 'abs' || value === 'none' || value === undefined;

export const isDirectoryConfig = (
	value: string
): value is 'default' | 'custom' => value === 'default' || value === 'custom';

export const isDrizzleDialect = (
	value: string | undefined
): value is AvailableDrizzleDialect =>
	availableDrizzleDialects.some((dialect) => dialect === value);

export const isPrismaDialect = (value: string | undefined): value is string =>
	availablePrismaDialects.some((dialect) => dialect === value);

export const isDatabaseEngine = (
	value: string | undefined
): value is DatabaseEngine =>
	availableDatabaseEngines.some((engine) => engine === value);

export const isDatabaseHost = (
	value: string | undefined
): value is DatabaseHost =>
	availableDatabaseHosts.some((host) => host === value);

export const isORM = (value: string | undefined): value is ORM =>
	value === 'drizzle' || value === 'prisma' || value === undefined;

export const isCodeQualityTool = (
	value: string | undefined
): value is CodeQualityTool =>
	value === 'eslint+prettier' || value === 'biome' || value === undefined;

export const isFrontend = (value: string | undefined): value is Frontend =>
	value !== undefined && Object.keys(frontendLabels).includes(value);
