import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { generateBiomeConfig } from '../src/generators/configurations/generateBiomeConfig.js';

const combos = [
	[], // vanilla
	['react'],
	['html'],
	['react', 'html'],
	['svelte'], // currently ignored in config
	['vue'], // currently ignored in config
	['htmx'], // treated as html in config
	['react', 'svelte', 'vue', 'html'] // everything
];

function run(cmd, args, cwd) {
	const { status, stdout, stderr } = spawnSync(cmd, args, {
		cwd,
		stdio: 'pipe',
		encoding: 'utf8'
	});
	return { status, out: stdout.trim(), err: stderr.trim() };
}

function writeSamples(root, hasReact, hasHtmlOrHtmx) {
	writeFileSync(join(root, 'a.ts'), 'export const x:number=1;\n');
	writeFileSync(join(root, 'b.js'), 'const y=2; console.log(y);\n');
	writeFileSync(join(root, 'c.css'), 'body{margin:0}\n');
	writeFileSync(join(root, 'd.json'), '{ "ok": true }\n');
	if (hasReact) {
		writeFileSync(
			join(root, 'App.jsx'),
			'export default function App(){return (<div>hi</div>)}\n'
		);
		writeFileSync(
			join(root, 'Main.tsx'),
			'export default function Main(){return (<span>ok</span>)}\n'
		);
	}
	if (hasHtmlOrHtmx) {
		writeFileSync(
			join(root, 'index.html'),
			'<!doctype html><html><head></head><body><div id=app></div></body></html>\n'
		);
	}
}

let failures = 0;

for (const frontends of combos) {
	const label = frontends.length ? frontends.join('+') : 'vanilla';
	const tmp = mkdtempSync(join(tmpdir(), `biome-${label}-`));
	try {
		const cfg = generateBiomeConfig({ frontends });
		writeFileSync(join(tmp, 'biome.json'), cfg);
		const hasReact = frontends.some((f) => /react/i.test(f));
		const hasHtmlOrHtmx = frontends.some((f) => /(html|htmx)/i.test(f));
		writeSamples(tmp, hasReact, hasHtmlOrHtmx);

		// Validate config + run lint/check/format (dry)
		const steps = [
			['npx', ['-y', '@biomejs/biome', 'check', '.'], 'check'],
			[
				'npx',
				['-y', '@biomejs/biome', 'lint', '.', '--reporter=summary'],
				'lint'
			],
			[
				'npx',
				['-y', '@biomejs/biome', 'format', '.', '--write=false'],
				'format-dry'
			]
		];

		for (const [cmd, args, name] of steps) {
			const { status, out, err } = run(cmd, args, tmp);
			if (status !== 0) {
				failures++;
				console.error(
					`✗ ${label}: biome ${name} failed\n${out}\n${err}\n`
				);
			} else {
				console.log(`✓ ${label}: biome ${name} ok`);
			}
		}
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
}

if (failures > 0) {
	console.error(`Biome self-test: ${failures} failure(s)`);
	process.exit(1);
} else {
	console.log('Biome self-test: all good');
}
