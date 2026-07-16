import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

export const agentRuntimeSource = `import {
	createAgency,
	createAgentControlPlane,
	createMemoryAgencyStore,
	createMemoryAgentControlStore,
	denyAllPolicy
} from '@absolutejs/agency'

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
	writeFileSync(join(projectName, 'AGENTS.md'), agentsGuide);
};
