# Test CLI Migration — Phase 1 Plan (Shared Utilities)

## Goals
- Provide Bun-native helpers that rewrite the functionality embedded in the legacy runners.
- Give Bun tests a consistent way to scaffold projects, install dependencies with caching, manage Docker databases, and assert results.
- Keep parity with existing failure messaging so the eventual swap is transparent to developers.

## Proposed Directory Layout

```
tests/
  functional/
    support/
      scaffold.ts
      install.ts
      docker.ts
      http.ts
      assertions.ts
      timing.ts
      index.ts
```

- `tests/functional/support/index.ts` re-exports the public helpers so suites can `import { scaffoldProject } from '../support'`.

## Module Responsibilities & APIs

### `scaffold.ts`
- Wraps CLI project generation.
- Exports:
  - `ScaffoldConfig`: flags (framework, db, orm, auth, tailwind, directory, code quality).
  - `scaffoldProject(config: ScaffoldConfig): Promise<ScaffoldResult>` — runs `bun run src/index.ts` with the right CLI flags, mirrors spinner output (`→ Scaffolding project...`).
  - `cleanupProject(projectName: string): Promise<void>` — removes previous directories using `rm -rf`, matching `cleanupProjectDirectory`.
- Handles timeout logic (configurable default 2 min). On timeout returns `{ success: false, error: 'TIMEOUT', elapsedMs }`.
- Emits console output identical to legacy runner (✓/✗ with timings).

### `install.ts`
- Centralises dependency cache logic.
- Re-uses existing helpers (`computeManifestHash`, `getOrInstallDependencies`, `hasCachedDependencies`) internally.
- Exports:
  - `installDependencies(projectDir, packageManager?: 'bun' | 'npm'): Promise<StepResult>`
  - `requireCachedDependencies(hashContext): Promise<{ hit: boolean }>` for suites that need to know whether the cache existed.
- Maintains the same AccessDenied messaging by letting `bun install` surface raw stderr.

### `docker.ts`
- Abstracts database lifecycle.
- Exports:
  - `ensureDockerAvailable(): Promise<'available' | 'unavailable'>` — replicates legacy guard that exits early with the same CLI messaging.
  - `withDockerCompose(projectDir, options, callback)` — runs `bun db:up`, waits with `sleep`, executes callback, finally runs `bun db:down`.
- Captures common errors (permission denied, missing compose file) and surfaces structured failures for assertions.

### `http.ts`
- Minimal wrapper around fetch against the scaffolded server.
- Provides helpers like `getJson(url)` and `expectStatus(url, status)` to replace repeated `fetch` + status check code in validators.

### `assertions.ts`
- Convenience assertions for Bun tests (no dependency on Vitest expect packages).
- Provides `assertSuccess(result, context)` and `logStep({ label, result })` to standardise console output.

### `timing.ts`
- Houses `measureStep(label, fn)` and `formatDuration(ms)` used by other helpers.

## Data Types

Define shared `StepResult` interface used across helpers:
```ts
type StepResult = {
  success: boolean;
  elapsedMs: number;
  errors: string[];
  warnings: string[];
};
```

Re-export from `support/index.ts` to keep types consistent between suites.

## Parity Requirements
- All helpers must print the same status lines as the legacy scripts (`→ Scaffolding project... ✓ (####ms)`).
- Timeout durations should remain configurable but default to the same 2-minute window used today.
- Docker permission errors must propagate unchanged so CI continues to highlight missing privileges.
- Cache hits should log `(cached, ###ms)` exactly as before; we can factor the logging into `install.ts`.

## Upcoming Work — Database Suites

- Reuse `runFrameworkMatrix` patterns to build database-focused drivers (one per engine) that:
  - scaffold the appropriate backend template (with matrix filters keyed on database + ORM + auth);
  - call shared helpers for dependency install and Docker lifecycle (ensuring `ensureDockerAvailable` runs before `bun db:up`);
  - trigger the existing database validators (e.g. `validateSQLiteDatabase`) with `skipDependencies: true` where applicable.
- Introduce `runDatabaseMatrix` helper mirroring `runFrameworkMatrix` but with database-specific hooks (e.g. seeding, Docker waits).
- Ensure environment skips remain intact: suites should detect missing credentials (Neon/Turso/etc.) and log the same skip reason.
- When porting each suite (SQLite → PostgreSQL → MySQL → MongoDB), keep parity notes from Phase 0 in mind so error messaging (missing Docker, missing scaffold) aligns with the legacy output.

## Implementation Steps
1. Create `tests/functional/support/` directory with scaffolding helper skeletons.
2. Move shared logic out of `scripts/functional-tests/test-utils.ts`, `dependency-cache.ts`, etc., into the new modules while leaving compatibility exports in place until suites migrate.
3. Update one legacy runner to consume the new helpers (Phase 2) to prove parity before deleting old utilities.

