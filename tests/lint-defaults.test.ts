import { expect, test } from 'bun:test';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { ESLint } from 'eslint';
import { generateEslintConfig } from '../src/generators/configurations/generateEslintConfig';

test('starter lint rejects raw database queries and browser fetch, accepts typed application data', async () => {
	const dir = await mkdtemp(join(process.cwd(), '.lint-fixture-'));
	try {
		const config = join(dir, 'eslint.config.mjs');
		await writeFile(config, generateEslintConfig([]));
		const eslint = new ESLint({ cwd: dir, overrideConfigFile: config });
		const raw = await eslint.lintText(
			"export const query = (sql: { unsafe: (query: string) => void }) => sql.unsafe('SELECT COUNT(*) FROM bookings FOR UPDATE');",
			{ filePath: 'src/backend/api.ts' }
		);
		expect(
			raw[0]?.messages.some(
				(item) =>
					item.ruleId === 'absolute/prefer-drizzle-query-builders'
			)
		).toBe(true);
		const browser = await eslint.lintText(
			"export const load = () => fetch('/api/bookings');",
			{ filePath: 'src/frontend/client.ts' }
		);
		expect(
			browser[0]?.messages.some(
				(item) => item.ruleId === 'no-restricted-syntax'
			)
		).toBe(true);
		const valid = await eslint.lintText('export const capacity = 6;', {
			filePath: 'src/backend/db.ts'
		});
		expect(valid[0]?.errorCount).toBe(0);
		expect(
			await eslint.isPathIgnored(join(dir, 'build/generated.ts'))
		).toBe(true);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
});
