import { frontendLabels } from './data';
import type {
	AuthProvider,
	CodeQualityTool,
	DatabaseEngine,
	DatabaseHost,
	Frontend,
	HTMLScriptOption,
	Language,
	ORM
} from './types';

export const isLanguage = (value: string): value is Language =>
	value === 'ts' || value === 'js';

export const isAuthProvider = (
	value: string | undefined
): value is AuthProvider =>
	value === 'absoluteAuth' || value === 'none' || value === undefined;

export const isDirectoryConfig = (
	value: string
): value is 'default' | 'custom' => value === 'default' || value === 'custom';

export const isDatabaseEngine = (
	value: string | undefined
): value is DatabaseEngine =>
	value === 'postgresql' ||
	value === 'mysql' ||
	value === 'sqlite' ||
	value === 'mongodb' ||
	value === 'redis' ||
	value === 'singlestore' ||
	value === 'cockroachdb' ||
	value === 'mssql' ||
	value === 'none' ||
	value === undefined;

export const isDatabaseHost = (
	value: string | undefined
): value is DatabaseHost =>
	value === 'neon' ||
	value === 'planetscale' ||
	value === 'supabase' ||
	value === 'turso' ||
	value === 'vercel' ||
	value === 'upstash' ||
	value === 'atlas' ||
	value === undefined;

export const isORM = (value: string | undefined): value is ORM =>
	value === 'drizzle' || value === 'prisma' || value === undefined;

export const isCodeQualityTool = (
	value: string | undefined
): value is CodeQualityTool =>
	value === 'eslint+prettier' || value === 'biome' || value === undefined;

export const isHTMLScriptOption = (
	value: string | undefined
): value is HTMLScriptOption =>
	value === 'ts' ||
	value === 'js' ||
	value === 'ts+ssr' ||
	value === 'js+ssr' ||
	value === 'none' ||
	value === undefined;

export const isFrontend = (value: string): value is Frontend =>
	Object.keys(frontendLabels).includes(value);
