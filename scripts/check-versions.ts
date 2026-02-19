import pc from 'picocolors';

import { versions } from '../src/versions';

type VersionResult = {
	current: string;
	latest: string;
	name: string;
	status: 'error' | 'outdated' | 'up-to-date';
	bump?: 'major' | 'minor' | 'patch';
};

const parseSemver = (ver: string) => {
	const [major, minor, patch] = ver.replace(/^[^\d]*/, '').split('.');

	return {
		major: Number(major),
		minor: Number(minor),
		patch: Number(patch)
	};
};

const getBump = (
	current: string,
	latest: string
): 'major' | 'minor' | 'patch' => {
	const cur = parseSemver(current);
	const lat = parseSemver(latest);
	if (lat.major !== cur.major) return 'major';
	if (lat.minor !== cur.minor) return 'minor';

	return 'patch';
};

const fetchLatest = async (name: string): Promise<string | null> => {
	try {
		const res = await fetch(`https://registry.npmjs.org/${name}/latest`);
		const data = (await res.json()) as { version: string };

		return data.version;
	} catch {
		return null;
	}
};

const entries = Object.entries(versions);
console.log(`\nChecking ${entries.length} packages against npm registry…\n`);

const results: VersionResult[] = await Promise.all(
	entries.map(async ([name, current]) => {
		const latest = await fetchLatest(name);
		if (!latest)
			return {
				current,
				latest: '??',
				name,
				status: 'error' as const
			};
		if (latest === current)
			return {
				current,
				latest,
				name,
				status: 'up-to-date' as const
			};

		return {
			bump: getBump(current, latest),
			current,
			latest,
			name,
			status: 'outdated' as const
		};
	})
);

const outdated = results.filter((res) => res.status === 'outdated');
const errors = results.filter((res) => res.status === 'error');
const upToDate = results.filter((res) => res.status === 'up-to-date');

const nameWidth = Math.max(...results.map((res) => res.name.length), 7);
const curWidth = Math.max(...results.map((res) => res.current.length), 7);
const latWidth = Math.max(...results.map((res) => res.latest.length), 6);

const pad = (str: string, len: number) => str.padEnd(len);

const colorLatest = (res: VersionResult) => {
	const padded = pad(res.latest, latWidth);
	if (res.bump === 'major') return pc.red(padded);
	if (res.bump === 'minor') return pc.yellow(padded);

	return pc.green(padded);
};

if (outdated.length > 0) {
	console.log(pc.yellow('⚠ Outdated:'));
	console.log(
		`${pad('Package', nameWidth)}  ${pad('Current', curWidth)}  ${pad('Latest', latWidth)}`
	);
	console.log('-'.repeat(nameWidth + curWidth + latWidth + 4));
	for (const res of outdated) {
		console.log(
			`${pad(res.name, nameWidth)}  ${pc.dim(pad(res.current, curWidth))}  ${colorLatest(res)}`
		);
	}
	console.log();
}

if (errors.length > 0) {
	console.log(pc.red('✗ Failed to fetch:'));
	for (const res of errors) {
		console.log(`  ${res.name}`);
	}
	console.log();
}

console.log(
	`${pc.green(`✓ ${upToDate.length} up-to-date`)}  ${pc.yellow(`⚠ ${outdated.length} outdated`)}  ${pc.red(`✗ ${errors.length} errors`)}\n`
);

if (outdated.length > 0) process.exit(1);
