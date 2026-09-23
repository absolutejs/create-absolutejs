# create-absolutejs

A CLI tool to scaffold new AbsoluteJS projects quickly and effortlessly.

## Usage

Scaffold a new project called `<project-name>`:

```bash
bun create absolutejs my-app
```

Alternatively, using npm, Yarn, or pnpm:

```bash
npm create absolutejs my-app
yarn create absolutejs my-app
pnpm create absolutejs my-app
```

By default, the CLI will interactively prompt you for any missing configuration values. You can also supply flags to skip those prompts:

- To skip **all** optional prompts and use `none` for every optional configuration:
    ```bash
    bun create absolutejs my-app --skip
    ```
- To skip **one** optional prompt without providing a real value, pass `none` to that flag:
    ```bash
    bun create absolutejs my-app --auth none --engine none
    ```

## Options

```text
Usage: create-absolute [project-name] [options]
```

### Arguments

- `project-name`  
  Name of the application to create. If omitted, you'll be prompted to enter one.

### Options

- `--help`, `-h`  
  Show this help message and exit.

- `--debug`, `-d`  
  Display a summary of the project configuration after creation.

- `--angular`  
  Include an Angular frontend.

- `--agentic`
  Add the provider-neutral agent stack: Agency action enforcement and kill
  switch, agent auth, MCP Tasks, credential operations, bounded wallet spend,
  manifest contract 2, and the adversarial conformance harness. The scaffold
  creates `src/backend/agent.ts` with a deny-by-default policy plus an
  `AGENTS.md` execution contract.

- `--angular-dir <directory>`  
  Specify the directory for and use the Angular frontend.

- `--assets <directory>`  
  Directory name for your static assets.

- `--auth <plugin|none>`  
  Pre-configured auth plugin (currently only `absolute-auth`) or `none`.

- `--biome`  
  Use Biome for code quality and formatting.

- `--build <direrctory>`  
  Output directory for build artifacts.

- `--db <engine|none>`  
  Database engine (`postgresql` | `mysql` | `mariadb` | `sqlite` | `mongodb` | `gel` | `singlestore` | `cockroachdb` | `mssql`) or `none`.

- `--db-dir <directory>`  
  Directory name for your database files.

- `--db-host <provider|none>`  
  Database host provider (`neon` | `planetscale` | `turso`) or `none`.

- `--directory <default|custom>`  
  Directory-naming strategy: `default` or `custom`.

- `--eslint+prettier`  
  Use ESLint + Prettier for code quality and formatting.

- `--git`  
  Initialize a Git repository.

- `--html`  
  Include a plain HTML frontend.

- `--html-dir <directory>`  
  Specify the directory for and use the HTML frontend.

- `--html-scripts`  
  Enable HTML scripting with TypeScript.

- `--htmx`  
  Include an HTMX frontend.

- `--htmx-dir <directory>`  
  Specify the directory for and use the HTMX frontend.

- `--install`  
  Use the same package manager to install dependencies.

- `--lts`  
  Use LTS versions of required packages.

- `--orm <drizzle|none>`
  ORM to configure: `drizzle` | `none`. Prisma scaffolding is not implemented and is rejected before files are written. Drizzle 1 no longer includes the Gel dialect; choose no ORM for Gel.

- `--plugin <plugin>`  
  Elysia plugin(s) to include (repeatable); `none` skips plugin setup. Select
  `@absolutejs/observability` to mount the credential-safe error, Replay,
  vitals, and Support Mode relay from environment configuration.

```bash
bun create absolutejs my-app \
  --plugin @absolutejs/observability
```

- `--react`  
  Include a React frontend.

- `--react-dir <directory>`  
  Specify the directory for and use the React frontend.

- `--skip`  
  Skip non-required prompts; uses `none` for all optional configs.

- `--svelte`  
  Include a Svelte frontend.

- `--svelte-dir <directory>`  
  Specify the directory for and use the Svelte frontend.

- `--tailwind`  
  Include Tailwind CSS setup.

- `--tailwind-input <file>`  
  Path to your Tailwind CSS entry file.

- `--tailwind-output <file>`  
  Path for the generated Tailwind CSS bundle.

- `--vue`  
  Include a Vue frontend.

- `--vue-dir <directory>`  
  Specify the directory for and use the Vue frontend.

## Directory Configuration

Choose between the **default** layout (pre-configured folder names) or **custom**, which prompts you to specify each directory name yourself:

```bash
bun create absolutejs my-app --directory custom
```

## Debug & LTS Flags

- `--debug`, `-d`  
  After scaffolding, prints a detailed summary of your configuration (language, frontends, directories, etc.).
- `--lts`  
  Instructs the CLI to fetch and pin the latest published versions of your dependencies instead of its default pinned versions.

## Getting Started

Once the scaffold completes, you’re ready to go:

```bash
cd my-app
# (If you skipped automated install)
bun install
# Then start the dev server
bun run dev
```

If you downloaded this repository to test or make changes you can use `bun run test` to start the created dev server without having to change directories back and forth.

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests to improve the CLI.

## License

**Business Source License 1.1 (BSL-1.1)** – see [`LICENSE`](./LICENSE) for details.

## Scaffold compatibility and verification

The CLI pins published registry versions; it does not install local package links.
The compatibility policy in `src/utils/registryChannel.ts` also applies when
resolving versions at creation time, so npm's older `latest` tag cannot silently
switch a generated server back to Elysia 1.

- AbsoluteJS uses its current 0.20 beta channel.
- Elysia remains at 2.0.0-beta.6 and OpenAPI at 2.0.0-beta.2: the published
  authentication/plugin contracts still rely on `ElysiaStatus.code`, which later
  Elysia betas changed. Upgrading these requires a coordinated SDK migration.
- TypeScript 5.9.3 and Angular's current 21 LTS patches match the framework's
  compiler peer dependencies. Newer incompatible compiler majors are not selected.
- Drizzle ORM and Kit use the coordinated 1.0 release-candidate channel.
- All other pins are checked against their latest published release channel.

Automatic authentication setup currently supplies a complete Google configuration
and requires a persistent database. Configure other login providers explicitly
using `@absolutejs/auth` after creation; the CLI rejects unsupported automatic
provider configurations instead of silently omitting them. Auth sessions are
in-memory by default; configure a shared session store for multi-instance hosting.

`bun run check-versions` checks every scaffold pin against that policy.
`bun run check:package` runs typechecking, unit tests, compilation and release
metadata validation. `bun run test:starters` scaffolds representative frontend,
plugin, database and agentic combinations into a temporary directory, installs
real registry dependencies, and checks TypeScript and ESLint. SQLite cases also
exercise generated HTTP validation and persistence using an isolated database.
The matrix creates Docker configuration files but does not start containers or
connect to paid providers. Use `SCAFFOLD_CHECK_CASES=sqlite-auth,all-frontends` to
select cases. Hosted database credentials and real OAuth acceptance are separate
integration checks, not implied by this matrix.
