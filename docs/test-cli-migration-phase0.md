# Test CLI Migration — Phase 0 Snapshot

> **Note:** Phase 3 replaced the legacy `scripts/functional-tests/*-test-runner.ts` files with Bun test suites. This document preserves their original inventory for historical reference only.

## 1. Baseline Command Outputs

### `bun run test:cli --all --dry-run`
- Lists 15 functional runners that would execute, covering core validators, framework suites, database suites, cloud, and auth.
- Confirms legacy harness still shells out to `scripts/functional-tests/*.ts`.

### `bun run test:cli --all`
- Core functional validators fail immediately because the expected scaffold (`absolutejs-project/`) is absent.
- React suite runs and passes for all SQLite permutations thanks to cached installs; MongoDB permutations fail early because Docker access is blocked; the command was interrupted before completing the remaining suites.
- Vue suite shows systemic dependency-install failures (`bun is unable to write files to tempdir: AccessDenied`), reflecting the current sandbox limitation we already account for in CI notes.
- MongoDB setups across suites fail with `docker compose ... connect: operation not permitted`, confirming the need to keep Docker access checks in the new runner.
- Partial output is sufficient for parity: the new Bun-based runner must surface identical failure conditions (missing scaffold, missing Docker, bun install permissions).

## 2. Legacy Suite Registry

`scripts/functional-tests/test-cli-registry.ts` currently declares the discoverable suites. Key facts:

| Suite | Group | Purpose | Functional Runner | Extra Inputs |
|-------|-------|---------|-------------------|--------------|
| functional | core | chains dependency/build/server validators against a pre-generated scaffold | `functional-test-runner.ts` (expects `absolutejs-project bun`) | none |
| server | core | verifies scaffold boots (`bun run dev`) | `server-startup-validator.ts` | none |
| build | core | executes type-check/build pipeline | `build-validator.ts` | none |
| deps | core | ensures installs succeed | `dependency-installer-tester.ts` | none |
| react | framework | React matrix | `react-test-runner.ts` | implicit matrix inside script |
| vue | framework | Vue matrix | `vue-test-runner.ts` | implicit matrix |
| svelte | framework | Svelte matrix | `svelte-test-runner.ts` | implicit matrix |
| html | framework | HTML validator | `html-test-runner.ts` | implicit matrix |
| htmx | framework | HTMX validator | `htmx-test-runner.ts` | implicit matrix |
| sqlite | database | SQLite validations | `sqlite-test-runner.ts` (+ behavioural `tests/behavioural/sqlite-matrix.test.ts`) | matrix |
| postgresql | database | PostgreSQL validations | `postgresql-test-runner.ts` (+ behavioural suite) | matrix + Docker |
| mysql | database | MySQL validations | `mysql-test-runner.ts` (+ behavioural suite) | matrix + Docker |
| mongodb | database | MongoDB validations | `mongodb-test-runner.ts` (+ behavioural suite) | Docker |
| cloud | cloud | Neon/Turso combinations | `cloud-provider-test-runner.ts` (+ behavioural suite) | env-gated |
| auth | auth | absoluteAuth permutations | `auth-test-runner.ts` (+ behavioural suite) | matrix |

The helper also exports the normalised sets of frameworks, databases, and providers for CLI flag validation—these constants must stay in sync when we swap in Bun tests.

## 3. Parity Notes for Migration

- **Expected failures**: missing scaffold directory, Docker socket permission errors, and Bun tempdir limitations must remain visible in the Bun-based run so developers notice environment problems early.
- **Matrix execution**: Framework/database runners currently manage their own matrices internally; the Bun rewrite needs to replicate ordering and skip semantics (e.g., cloud suite skips without provider credentials).
- **Behavioural tie-in**: Several suites still list behavioural tests even though the corresponding `tests/behavioural/*.test.ts` files were deleted earlier—call this out for cleanup in later phases when we re-home them under Bun.

