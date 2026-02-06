import { getPackageVersion } from '../src/utils/getPackageVersion';
import { versions } from '../src/versions';

type VersionResult = {
	name: string;
	current: string;
	latest: string;
	status: 'up-to-date' | 'outdated' | 'error';
};

const entries = Object.entries(versions);
console.log(`\nChecking ${entries.length} packages against npm registry…\n`);

const results: VersionResult[] = entries.map(([name, current]) => {
	const latest = getPackageVersion(name);
	if (!latest) return { current, latest: '??', name, status: 'error' as const };
	const status = latest === current ? ('up-to-date' as const) : ('outdated' as const);

	return { current, latest, name, status };
});

const outdated = results.filter((res) => res.status === 'outdated');
const errors = results.filter((res) => res.status === 'error');
const upToDate = results.filter((res) => res.status === 'up-to-date');

const nameWidth = Math.max(...results.map((res) => res.name.length), 7);
const curWidth = Math.max(...results.map((res) => res.current.length), 7);
const latWidth = Math.max(...results.map((res) => res.latest.length), 6);

const pad = (str: string, len: number) => str.padEnd(len);
const header = `${pad('Package', nameWidth)}  ${pad('Current', curWidth)}  ${pad('Latest', latWidth)}`;
const divider = '-'.repeat(header.length);

if (outdated.length > 0) {
	console.log('\x1b[33m⚠ Outdated:\x1b[0m');
	console.log(header);
	console.log(divider);
	for (const res of outdated) {
		console.log(
			`${pad(res.name, nameWidth)}  \x1b[31m${pad(res.current, curWidth)}\x1b[0m  \x1b[32m${pad(res.latest, latWidth)}\x1b[0m`
		);
	}
	console.log();
}

if (errors.length > 0) {
	console.log('\x1b[31m✗ Failed to fetch:\x1b[0m');
	for (const res of errors) {
		console.log(`  ${res.name}`);
	}
	console.log();
}

console.log(
	`\x1b[32m✓ ${upToDate.length} up-to-date\x1b[0m  \x1b[33m⚠ ${outdated.length} outdated\x1b[0m  \x1b[31m✗ ${errors.length} errors\x1b[0m\n`
);

if (outdated.length > 0) process.exit(1);
