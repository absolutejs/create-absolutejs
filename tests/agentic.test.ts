import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
	agentRuntimeSource,
	agentsGuide,
	scaffoldAgentic
} from '../src/generators/project/scaffoldAgentic';

describe('agentic scaffold', () => {
	test('is deny-by-default and documents every privileged boundary', () => {
		expect(agentRuntimeSource).toContain('denyAllPolicy()');
		expect(agentRuntimeSource).toContain('control: agentControl');
		for (const boundary of [
			'@absolutejs/auth',
			'@absolutejs/secrets',
			'wallet allowances',
			'MCP task handles',
			'@absolutejs/agent-conformance',
			'kill switch'
		])
			expect(agentsGuide).toContain(boundary);
	});

	test('writes the runtime and AGENTS.md to a project', () => {
		const projectName = mkdtempSync(join(tmpdir(), 'absolute-agentic-'));
		const backendDirectory = join(projectName, 'src', 'backend');
		scaffoldAgentic({ backendDirectory, projectName });
		expect(readFileSync(join(backendDirectory, 'agent.ts'), 'utf8')).toBe(
			agentRuntimeSource
		);
		expect(readFileSync(join(projectName, 'AGENTS.md'), 'utf8')).toBe(
			agentsGuide
		);
	});
});
