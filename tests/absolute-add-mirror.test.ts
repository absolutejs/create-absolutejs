import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join, resolve } from 'path';
import { describe, expect, test } from 'bun:test';
import { createPackageJson } from '../src/generators/configurations/generatePackageJson';
import type { PackageJson } from '../src/types';
import { frameworkPackages, versions } from '../src/versions';

/* `absolute add <framework>` (absolutejs src/cli/add/dependencies.ts) installs
 * exactly what this scaffold installs for that framework: SCAFFOLD_VERSIONS
 * mirrors the framework entries of src/versions.ts, and FRAMEWORK_PACKAGES the
 * per-framework lists in generatePackageJson.ts. These tests compare the two
 * when an absolutejs checkout is found (ABSOLUTEJS_DIR, or an `absolutejs`
 * folder beside this repo or any of its parent directories). */

const MIRROR_FILE = join('src', 'cli', 'add', 'dependencies.ts');
const FRAMEWORKS = ['angular', 'html', 'htmx', 'react', 'svelte', 'vue'];

type Sections = {
	dependencies: Record<string, string>;
	devDependencies: Record<string, string>;
};

type MirrorModule = {
	FRAMEWORK_PACKAGES: Record<
		string,
		{ dependencies: readonly string[]; devDependencies: readonly string[] }
	>;
	SCAFFOLD_VERSIONS: Record<string, string>;
};

const findMirrorFile = () => {
	const fromEnv = process.env.ABSOLUTEJS_DIR;
	if (fromEnv) {
		const file = join(resolve(fromEnv), MIRROR_FILE);

		return existsSync(file) ? file : undefined;
	}

	let dir = resolve(import.meta.dir, '..');
	while (dirname(dir) !== dir) {
		const file = join(dirname(dir), 'absolutejs', MIRROR_FILE);
		if (existsSync(file)) return file;
		dir = dirname(dir);
	}

	return undefined;
};

/* The generated package.json for a project with only these frontends.
 * Biome, so the React-only ESLint plugins (a code quality choice, not part of
 * the framework) stay out. */
const generate = async (frontendDirectories: Record<string, string>) => {
	const project = mkdtempSync(join(tmpdir(), 'absolute-add-mirror-'));
	try {
		await createPackageJson({
			agentic: false,
			authOption: 'none',
			codeQualityTool: 'biome',
			databaseEngine: 'none',
			databaseHost: 'none',
			frontendDirectories,
			latest: false,
			orm: 'none',
			plugins: [],
			projectName: project,
			repositoryUrl: undefined,
			useTailwind: false
		});
		const packageJson: PackageJson = JSON.parse(
			readFileSync(join(project, 'package.json'), 'utf8')
		);

		return {
			dependencies: packageJson.dependencies ?? {},
			devDependencies: packageJson.devDependencies ?? {}
		};
	} finally {
		rmSync(project, { force: true, recursive: true });
	}
};

const without = (
	section: Record<string, string>,
	baseline: Record<string, string>
) =>
	Object.fromEntries(
		Object.entries(section).filter(([name]) => !(name in baseline))
	);

/* What a framework adds to a project with no frontend at all. */
const frameworkSections = async (framework: string) => {
	const baseline = await generate({});
	const project = await generate({ [framework]: framework });
	const sections: Sections = {
		dependencies: without(project.dependencies, baseline.dependencies),
		devDependencies: without(
			project.devDependencies,
			baseline.devDependencies
		)
	};

	return sections;
};

const sortedKeys = (record: Record<string, string>) =>
	Object.keys(record).sort();

describe('frameworkPackages', () => {
	test('lists exactly the packages the frameworks add', async () => {
		const added = await Promise.all(FRAMEWORKS.map(frameworkSections));
		const names = added.flatMap(({ dependencies, devDependencies }) => [
			...Object.keys(dependencies),
			...Object.keys(devDependencies)
		]);
		expect([...new Set(names)].sort()).toEqual(
			[...frameworkPackages].sort()
		);
	});
});

const mirrorFile = findMirrorFile();

describe.skipIf(mirrorFile === undefined)(
	`absolute add mirror (${mirrorFile ?? 'no absolutejs checkout found'})`,
	() => {
		const load = async () => {
			const mirror: MirrorModule = await import(mirrorFile ?? '');

			return mirror;
		};

		test('SCAFFOLD_VERSIONS matches src/versions.ts', async () => {
			const { SCAFFOLD_VERSIONS } = await load();
			const ours: Record<string, string> = versions;
			/* Our version of each mirrored package (undefined when
			   src/versions.ts has none), against the mirror's. */
			const oursForMirror: Record<string, string | undefined> =
				Object.fromEntries(
					Object.keys(SCAFFOLD_VERSIONS).map((name) => [
						name,
						ours[name]
					])
				);
			expect(oursForMirror).toEqual(SCAFFOLD_VERSIONS);
			expect(sortedKeys(SCAFFOLD_VERSIONS)).toEqual(
				[...frameworkPackages].sort()
			);
		});

		test('FRAMEWORK_PACKAGES covers the same frameworks', async () => {
			const { FRAMEWORK_PACKAGES } = await load();
			expect(Object.keys(FRAMEWORK_PACKAGES).sort()).toEqual(FRAMEWORKS);
		});

		for (const framework of FRAMEWORKS) {
			test(`${framework}: FRAMEWORK_PACKAGES matches generatePackageJson`, async () => {
				const { FRAMEWORK_PACKAGES } = await load();
				const { dependencies, devDependencies } =
					await frameworkSections(framework);
				expect({
					dependencies: [
						...(FRAMEWORK_PACKAGES[framework]?.dependencies ?? [])
					].sort(),
					devDependencies: [
						...(FRAMEWORK_PACKAGES[framework]?.devDependencies ??
							[])
					].sort()
				}).toEqual({
					dependencies: sortedKeys(dependencies),
					devDependencies: sortedKeys(devDependencies)
				});
			});
		}
	}
);
