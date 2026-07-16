import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

export const agentRuntimeSource = `import {
	createAgency,
	createAgentControlPlane,
	createMemoryAgencyStore,
	createMemoryAgentControlStore,
	denyAllPolicy
} from '@absolutejs/agency'
import {
	createAgentRuntime,
	createMemoryAgentRuntimeStore
} from '@absolutejs/agent-runtime'

// Memory stores are development defaults. Replace them with durable stores
// before running more than one process or accepting production actions.
export const agentControl = createAgentControlPlane({
	sources: [],
	store: createMemoryAgentControlStore()
})

// Intentionally deny-by-default. Replace denyAllPolicy() with your policy
// decision point only after declaring each action's effects and scopes.
export const agency = createAgency({
	control: agentControl,
	policy: denyAllPolicy(),
	store: createMemoryAgencyStore()
})

// Durable run semantics are available from the first commit. The placeholder
// driver fails closed until the application supplies its model/tool loop.
export const agentRuntime = createAgentRuntime({
	store: createMemoryAgentRuntimeStore(),
	driver: {
		next: async () => ({
			type: 'fail',
			code: 'agent_not_configured',
			message: 'Configure the agent driver before accepting runs'
		})
	},
	effects: {
		execute: async () => {
			throw new Error('Agent effects are not configured')
		}
	}
})
`;

export const agentDiscoverySource = `import {
	ABSOLUTE_AGENT_SCHEMA,
	createAgentDiscoveryHandler,
	signAgentDocument,
	type AgentDiscoveryDocument,
	type DiscoverySigner
} from '@absolutejs/agent-discovery'

// Keep this document specific and keyword-rich: registries rank declared
// capabilities, effects, scopes, interfaces, examples, and publisher trust.
export const createAgentDocument = ({
	origin,
	publishedAt,
	version
}: {
	origin: string
	publishedAt: string
	version: string
}): AgentDiscoveryDocument => ({
	$schema: ABSOLUTE_AGENT_SCHEMA,
	id: \`\${origin}/agents/main\`,
	name: 'Replace with your agent name',
	description: 'Replace with a precise description of the outcomes this agent delivers.',
	version,
	url: origin,
	publisher: {
		id: origin,
		name: 'Replace with your organization',
		jwksUri: \`\${origin}/.well-known/jwks.json\`
	},
	capabilities: [{
		id: 'status.read',
		title: 'Read service status',
		description: 'Returns the public health and readiness status of this agent.',
		tags: ['status', 'health', 'readiness'],
		effects: ['read'],
		approval: 'never'
	}],
	interfaces: [{
		type: 'http',
		url: \`\${origin}/api/agents/main\`,
		contentTypes: ['application/json']
	}],
	categories: ['replace-with-domain-category'],
	tags: ['replace-with-user-intent', 'replace-with-outcome'],
	languages: ['en'],
	documentationUrl: \`\${origin}/docs/agents/main\`,
	examples: [{
		title: 'Check whether the agent is ready',
		prompt: 'Check the agent service status.',
		capabilityId: 'status.read'
	}],
	createdAt: publishedAt,
	updatedAt: publishedAt
})

// Use a KMS/HSM-backed signer in production. Mount the returned fetch handler
// at the origin root so all well-known, A2A, JSON-LD, agents.txt, and sitemap
// discovery surfaces are served from one signed descriptor.
export const createAgentDiscovery = async ({
	signer,
	origin,
	publishedAt,
	version
}: {
	signer: DiscoverySigner
	origin: string
	publishedAt: string
	version: string
}) =>
	createAgentDiscoveryHandler({
		documents: [await signAgentDocument(
			createAgentDocument({ origin, publishedAt, version }),
			signer
		)]
	})
`;

export const agentsGuide = `# Agent execution contract

This project uses the AbsoluteJS provider-neutral agent stack.

- Authenticate agents and bind every delegation to a user with
  \`@absolutejs/auth\`. Never treat model-provided identity as authenticated.
- Route every effectful tool through \`agency\` in \`src/backend/agent.ts\`.
  Approval is exact-input-bound; execution requires a fresh single-use lease.
- Declare tool effects, scopes, approval policy, idempotency keys,
  reversibility, destinations, and spend fields in manifest contract 2.
- Keep raw credentials host-side with \`@absolutejs/secrets\` credential
  operations. Agents receive operation results, never secret values.
- Give agents bounded wallet allowances and signed mandates. The host resolves
  ledger destinations; an agent never supplies the recipient account id.
- Bind MCP task handles to the authenticated actor on get, update, and cancel.
- Use \`@absolutejs/execution\` for idempotent effects and its transactional
  PostgreSQL outbox before handing work to a durable queue.
- Publish and consume remote agents with \`@absolutejs/a2a\` using A2A 1.0;
  preserve the authenticated tenant and actor binding at every task boundary.
- Route outbound HTTP through \`@absolutejs/egress\`. Authorize host, method,
  resolved public IP, redirects, byte limits, and injected credentials host-side.
- Store immutable, digest-addressed policy revisions with \`@absolutejs/policy\`
  and atomically activate only reviewed versions.
- Publish the signed descriptor in \`src/backend/agent-discovery.ts\` through
  \`@absolutejs/agent-discovery\`. Keep capabilities, examples, tags, effects,
  scopes, A2A/MCP interfaces, JSON-LD, agents.txt, and sitemap surfaces current.
- Run long-lived work through \`@absolutejs/agent-runtime\`; use its leases,
  checkpoints, timers, budgets, cancellation, and crash-safe effect recovery.
- Authorize all HTTP/filesystem/process access with expiring
  \`@absolutejs/agent-sandbox\` grants. There is no ambient agent authority.
- Preserve instruction/data separation and provenance taints with
  \`@absolutejs/agent-trust\`; external content never becomes an instruction.
- Store scoped, expiring, provenance-bearing data with
  \`@absolutejs/agent-memory\`, and validate writes against memory poisoning.
- Receive only verified events through \`@absolutejs/agent-inbox\`; durable
  leases, retries, dead letters, and schedules do not require Redis.
- Use OpenID AuthZEN AARP for requestable approvals and COAZ mappings for
  parameter-level MCP authorization. Approval always triggers re-evaluation.
- Protect operator actions with \`@absolutejs/agent-control\` scopes, a
  kill-switch-first check, and leased idempotency records.
- Use \`@absolutejs/sync-bus-pg\` for durable framework channels. Redis is an
  optional at-most-once fanout adapter, not a source of truth or work queue.
- Run \`@absolutejs/agent-conformance\` suites for every new action, capability,
  credential, wallet, egress, execution, control, and task adapter.
- Use the control plane kill switch for incident response. It blocks new
  requests, lease issuance, and execution before downstream revocation fans out.

Memory stores are for local development only. Production stores must be
durable and enforce lease/capability consumption atomically. Apply each
package's exported PostgreSQL schema in a migration before enabling traffic.
`;

export const scaffoldAgentic = ({
	backendDirectory,
	projectName
}: {
	backendDirectory: string;
	projectName: string;
}) => {
	mkdirSync(backendDirectory, { recursive: true });
	writeFileSync(join(backendDirectory, 'agent.ts'), agentRuntimeSource);
	writeFileSync(
		join(backendDirectory, 'agent-discovery.ts'),
		agentDiscoverySource
	);
	writeFileSync(join(projectName, 'AGENTS.md'), agentsGuide);
};
