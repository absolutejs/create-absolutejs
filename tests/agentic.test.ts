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
			'@absolutejs/a2a',
			'@absolutejs/auth',
			'@absolutejs/egress',
			'@absolutejs/execution',
			'@absolutejs/policy',
			'@absolutejs/agent-control',
			'@absolutejs/secrets',
			'@absolutejs/sync-bus-pg',
			'wallet allowances',
			'MCP task handles',
			'@absolutejs/agent-conformance',
			'kill switch'
		])
			expect(agentsGuide).toContain(boundary);
	});

	test('documents Redis as optional rather than durable infrastructure', () => {
		expect(agentsGuide).toContain('Redis is an');
		expect(agentsGuide).toContain('not a source of truth or work queue');
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
