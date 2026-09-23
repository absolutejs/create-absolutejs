import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'bun:test';
import { Elysia, t } from 'elysia';
import { generateDatabaseTypes } from '../src/generators/db/generateDatabaseTypes';
import { generateDBBlock } from '../src/generators/project/generateDBBlock';
import { generateIdentity } from '../src/generators/project/generateIdentity';
import { generateRoutesBlock } from '../src/generators/project/generateRoutesBlock';
import { registryChannel } from '../src/utils/registryChannel';

test('database routes execute with Elysia 2 validation before the handler', async () => {
	const routes = generateRoutesBlock({
		authOption: 'none',
		databaseEngine: 'sqlite',
		frontendDirectories: {}
	});
	const calls: number[] = [];
	const createApplication = new Function(
		'Elysia',
		't',
		'db',
		'getCountHistory',
		'createCountHistory',
		`return new Elysia()${routes}`
	);
	const app: Elysia = createApplication(
		Elysia,
		t,
		{},
		(_db: unknown, uid: number) => ({ uid }),
		(_db: unknown, count: number) => {
			calls.push(count);

			return { count };
		}
	);
	const get = await app.handle(new Request('http://localhost/count/7'));
	expect(get.status).toBe(200);
	expect(await get.json()).toEqual({ uid: 7 });
	const post = (count: unknown) =>
		app.handle(
			new Request('http://localhost/count', {
				body: JSON.stringify({ count }),
				headers: { 'content-type': 'application/json' },
				method: 'POST'
			})
		);
	expect((await post('invalid')).status).toBe(422);
	expect(calls).toHaveLength(0);
	expect(await (await post(3)).json()).toEqual({ count: 3 });
	expect(calls).toEqual([3]);
});

test('registry channels cannot downgrade Elysia or cross incompatible compiler majors', () => {
	expect(registryChannel('elysia')).toBe('2.0.0-beta.6');
	expect(registryChannel('@absolutejs/absolute')).toBe('beta');
	expect(registryChannel('@elysia/eden')).toBe('next');
	expect(registryChannel('drizzle-orm')).toBe('rc');
	expect(registryChannel('typescript')).toBe('5.9.3');
	expect(registryChannel('@angular/core')).toBe('v21-lts');
	expect(registryChannel('react')).toBe('latest');
});

test('SQLite Drizzle uses the current driver constructor and type', () => {
	expect(
		generateDBBlock({
			databaseEngine: 'sqlite',
			databaseHost: 'none',
			orm: 'drizzle'
		})
	).toContain('drizzle({ client: pool })');
	expect(
		generateDatabaseTypes({
			authOption: 'abs',
			databaseEngine: 'sqlite',
			databaseHost: 'none',
			orm: 'drizzle'
		})
	).toContain('ReturnType<typeof drizzle>');
});

test('provider identity validation accepts nested JSON and rejects non-JSON values', async () => {
	const directory = await mkdtemp(join(tmpdir(), 'identity-check-'));
	const path = join(directory, 'identity.ts');
	await writeFile(path, generateIdentity());
	const mod = await import(path);
	await rm(directory, { recursive: true });
	expect(
		mod.parseUserIdentity({
			name: 'Alex',
			nested: { active: true, roles: ['owner'] }
		})
	).toEqual({ name: 'Alex', nested: { active: true, roles: ['owner'] } });
	expect(() => mod.parseUserIdentity({ bad: undefined })).toThrow();
	expect(() => mod.parseUserIdentity({ bad: NaN })).toThrow();
});
