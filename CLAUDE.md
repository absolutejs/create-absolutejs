# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`create-absolutejs` is a CLI tool that scaffolds full-stack AbsoluteJS projects. It runs an interactive prompt flow, collects configuration choices (frontends, database, ORM, auth, plugins, styling), then generates a complete project with an Elysia backend and one or more frontend frameworks.

## Commands

- **`bun run format`** - Prettier
- **`bun run typecheck`** - `tsc --noEmit`

## Architecture

### Entry Point & Flow

`src/index.ts` → `parseCommandLineOptions()` → `prompt()` → `scaffold()` → outro

The `scaffold()` function in `src/scaffold.ts` orchestrates all generation in order:

1. `initalizeRoot()` - Create project directory structure
2. `scaffoldConfigurationFiles()` - Copy/generate config files (tsconfig, tailwind, gitignore, .env)
3. `createPackageJson()` - Generate package.json with resolved dependencies and scripts
4. `scaffoldBackend()` - Generate `server.ts` by composing imports, build manifest, DB block, and routes
5. `scaffoldDatabase()` - Generate schema, handlers, types, and Docker setup (conditional)
6. `scaffoldFrontends()` - Dispatch to framework-specific scaffolders
7. `installDependencies()`, `formatProject()`, `initializeGit()` (conditional)

### Key Directories

- **`src/generators/`** - Code generation modules, organized by concern:
    - `configurations/` - Config file generators (package.json, env, prettierrc, drizzle config)
    - `db/` - Database scaffolding (schema, handlers, Docker, types)
    - `project/` - Backend server generation (server.ts is composed from blocks: imports, build, DB, routes)
    - `react/`, `vue/`, `svelte/`, `html/`, `htmx/` - Frontend-specific scaffolders
- **`src/questions/`** - Individual prompt questions using `@clack/prompts`
- **`src/templates/`** - Static files copied into scaffolded projects (assets, config templates, frontend templates)
- **`src/utils/`** - CLI parsing, package manager detection, command maps

### Core Types (`src/types.ts`)

- **`CreateConfiguration`** - The complete user configuration collected from prompts; passed throughout scaffold
- **`ArgumentConfiguration`** - CLI argument overrides (all fields optional via `DeepUndefined`)
- **`AvailableDependency`** - Dependency definition with version and import metadata
- **`Frontend`**, **`DatabaseEngine`**, **`ORM`**, **`AuthOption`** - Union types derived from `src/data.ts` arrays

### Key Patterns

- **Block composition for server.ts**: The server file is built by composing `generateImportsBlock()`, `generateBuildBlock()`, `generateDBBlock()`, and `generateRoutesBlock()` based on config flags
- **`computeFlags()`** returns booleans (`requiresReact`, `requiresVue`, etc.) used for conditional code generation
- **`commandMaps.ts`** abstracts package manager differences (npm/yarn/pnpm/bun) for install, format, and dev commands
- **Template hybrid**: Static files in `src/templates/` are copied with `cpSync()`; dynamic files are generated as strings and written with `writeFileSync()`
- **Two tsconfig files**: `tsconfig.json` includes templates (for IDE support), `tsconfig.build.json` excludes them (templates are copied raw, not compiled)

## Code Style & Lint Rules

- **Function expressions only** (`func-style: expression`), arrow functions preferred
- **No default exports** (`import/no-default-export`) except config files
- **Object keys must be sorted** alphabetically (`absolute/sort-keys-fixable`)
- **Exports must be sorted** (`absolute/sort-exports`)
- **Imports must be ordered** alphabetically (`import/order`)
- **Min variable name length 3** (exceptions: `_`, `id`, `db`, `OK`)
- **Max nesting depth 1** (`absolute/max-depth-extended`)
- **Blank line before return statements** (`@stylistic/ts/padding-line-between-statements`)
- **No magic numbers** (except 0, 1, 2, -1)
- **Explicit object types required** (`absolute/explicit-object-types`)
- **Strict TypeScript**: `noImplicitAny`, `noUncheckedIndexedAccess`, `strict`
