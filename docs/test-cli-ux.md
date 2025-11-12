# Test CLI UX Specification

## Goals

- Provide a single entry point (`bun run test:cli`) for every validation path (functional harness + behavioural specs).
- Preserve the stakeholder‑approved experience from the legacy runner: intuitive flags, human friendly progress, concise summary, predictable exit codes.
- Allow selective execution by framework, database, auth, or cloud provider without learning internal script paths.
- Surface prerequisites (Docker availability, remote credentials, dependency cache) as explicit skip messages instead of opaque failures.

## Suite Taxonomy

| Group        | Suite Name       | Purpose                                                                    | Underlying runner                         |
|--------------|------------------|----------------------------------------------------------------------------|-------------------------------------------|
| `core`       | `functional`     | Smoke: dependency installer → build validator → server validator           | `scripts/functional-tests/functional-test-runner.ts` |
| `core`       | `server`         | Boot scaffolded server only                                                | `scripts/functional-tests/server-startup-validator.ts` |
| `core`       | `build`          | `tsc`/build pipeline sanity check                                          | `scripts/functional-tests/build-validator.ts` |
| `core`       | `deps`           | Cached dependency install health                                           | `scripts/functional-tests/dependency-installer-tester.ts` |
| `framework`  | `react`          | React matrix (behavioural + functional)                                    | `tests/functional/frameworks/react.test.ts` |
| `framework`  | `vue`            | Vue matrix                                                                 | `tests/functional/frameworks/vue.test.ts` |
| `framework`  | `svelte`         | Svelte matrix                                                              | `tests/functional/frameworks/svelte.test.ts` |
| `framework`  | `html`           | HTML matrix                                                                | `tests/functional/frameworks/html.test.ts` |
| `framework`  | `htmx`           | HTMX matrix                                                                | `tests/functional/frameworks/htmx.test.ts` |
| `database`   | `sqlite`         | SQLite combinations (local + Turso)                                        | `tests/functional/databases/sqlite.test.ts` |
| `database`   | `postgresql`     | PostgreSQL combinations (local + Neon)                                     | `tests/functional/databases/postgresql.test.ts` |
| `database`   | `mysql`          | MySQL combinations (local)                                                 | `tests/functional/databases/mysql.test.ts` |
| `database`   | `mongodb`        | MongoDB combinations                                                       | `tests/functional/databases/mongodb.test.ts` |
| `auth`       | `auth`           | AbsoluteAuth behavioural suite                                             | `tests/functional/auth.test.ts` |
| `cloud`      | `cloud`          | Neon + Turso permutations                                                  | `tests/functional/cloud.test.ts` |

Behavioural specs (`tests/behavioural/*.test.ts`) are executed indirectly by their functional counterparts or via the `--behavioural` flag (see below).

### Behavioural Spec Inventory

| Behavioural file | Scenarios exercised | Prerequisites / skip reasons |
|------------------|---------------------|-------------------------------|
| `sqlite-matrix.test.ts` | React, Vue, Svelte, HTML, React+Drizzle against SQLite | Requires dependency cache populated; no Docker needed. |
| `postgresql-matrix.test.ts` | React raw + Drizzle with local PostgreSQL | Needs Docker daemon; skips if Docker unreachable. |
| `mysql-matrix.test.ts` | React raw + Drizzle with local MySQL | Needs Docker daemon; skips if Docker unreachable. |
| `mongodb-matrix.test.ts` | React with local MongoDB | Needs Docker daemon; skips if Docker unreachable. |
| `auth-matrix.test.ts` | React SQLite AbsoluteAuth (plain + Drizzle) | Requires dependency cache; checks only public endpoints. |
| `cloud-matrix.test.ts` | React + Neon (Postgres) Drizzle, React + Turso (SQLite) Drizzle | Needs remote credentials (`ABSOLUTE_BEHAVIOURAL_NEON_DATABASE_URL`, `ABSOLUTE_BEHAVIOURAL_TURSO_DATABASE_URL`); skips when absent. |

## Command Synopsis

```
bun run test:cli [options]
```

### Core Options

| Flag | Description | Notes |
| ---- | ----------- | ----- |
| `-h`, `--help` | Print help and exit | |
| `--list` | List suites grouped by taxonomy | Mirrors table above |
| `--all` | Queue every suite (core → frameworks → databases → auth → cloud) | honour provider filters |
| `--suite <name>` | Explicit suite name (repeatable or comma separated) | case-insensitive |
| `--framework <name>` | Include matching framework suites | auto-adds suite if present |
| `--database <name>` | Include matching database suites | auto-adds suite |
| `--auth` | Alias for `--suite auth` | |
| `--cloud` | Alias for `--suite cloud` | |
| `--provider <name>` | Restrict cloud providers (e.g. `neon`, `turso`) | implies `--cloud`; sets `ABSOLUTE_CLOUD_PROVIDERS` |
| `--behavioural` | Force behavioural specs for selected suites | runs `bun test` with matching filters |
| `--functional` | Force functional runners only | default if omitted |
| `--dry-run` | Print the commands that would be executed | no side effects |
| `--ci` | Optimise output for CI (minimal noise, sets `CI=1`) | |
| `--clean` | Remove generated projects and `.test-dependency-cache` then exit | |

### Execution Semantics

- **Default**: no flags ⇒ run `functional` suite only.
- **Ordering**: core (deterministic order) → framework suites (alphabetical) → database suites → auth → cloud.
- **De-duplication**: suites added multiple times run once.
- **Skip behaviour**: suites that detect missing Docker/credentials log `Skipping …` and exit 0; the caller still sees them in the summary.
- **Exit codes**: first non-zero suite exit propagates as the overall exit code (legacy behaviour). Optional `--keep-going` can be added later if stakeholders request.

## Output Contract

- Per-suite progress line: `[n/total] Running {label} ({name})`
- Success: `✓ {label} passed ({duration}ms)`
- Failure: `✗ {label} failed (exit code X, {duration}ms)`
- Summary block with counts (`Total`, `Passed`, `Failed`) and status per suite.
- When skipping, show `⚠` line with reason but count it as “passed” for exit code purposes.
- Dry run: bullet list of commands (`• bun run …`) plus environment hints.
- CI mode: progress lines suppressed; only summary + failure lines emitted.

## Behavioural Integration Details

- `--behavioural` triggers targeted `bun test` invocations by framework/database/auth group using `--filter` expressions (e.g. `bun test --filter postgres`).
- Functional runners set `ABSOLUTE_BEHAVIOURAL_MODE=1` when chained, so downstream scripts can suppress redundant scaffolding.
- Skip logic reuses the same heuristics as behavioural tests (dependency cache, Docker, credentials).

## Backlog / Follow-ups

- Optional `--interactive` flag to mimic early prompt-driven UX.
- Archive JSON summary for CI dashboards.
- Document provider environment variables in README once implementation lands.


