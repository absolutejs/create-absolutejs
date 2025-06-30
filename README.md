# create-absolutejs

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

## Options

```text
Usage: create-absolute [options] [project-name]
```

### Arguments

- `project-name`  
  Name of the application to create. If omitted, you'll be prompted to enter one.

### Options

- `--help`, `-h`  
  Show the help message and exit.
- `--debug`, `-d`  
  Display a summary of the project configuration after creation.
- `--angular <name>`  
  Directory name for an Angular frontend.
- `--assets <name>`  
  Directory name for your static assets.
- `--auth <provider|none>`  
  Preconfigured auth plugin or `none` to skip auth setup.
- `--build <dir>`  
  Output directory for build artifacts.
- `--database <name>`  
  Directory name for your database files.
- `--directory <default|custom>`  
  Directory-naming strategy: `"default"` or `"custom"`.
- `--engine <engine|none>`  
  Database engine (`postgresql` | `mysql` | `sqlite` | `mongodb` | `redis` | `singlestore` | `cockroachdb` | `mssql`) or `none`.
- `--frontend <framework>`  
  Frontend framework(s) to include: one or more of `react`, `svelte`, `html`, `htmx`, `vue`, `angular`.
- `--git`  
  Initialize a Git repository.
- `--host <provider|none>`  
  Database host provider (`neon` | `planetscale` | `supabase` | `turso` | `vercel` | `upstash` | `atlas`) or `none`.
- `--html <name>`  
  Directory name for an HTML frontend.
- `--htmx <name>`  
  Directory name for an HTMX frontend.
- `--lang <ts|js>`  
  Language: `ts` or `js`.
- `--lts`  
  Use the latest published versions of required packages.
- `--npm`  
  Use the package manager that invoked this command to install dependencies.
- `--orm <drizzle|prisma|none>`  
  ORM to configure: `drizzle` or `prisma` or `none`.
- `--plugin <plugin>`  
  Elysia plugin(s) to include (can be specified multiple times), or `none` to skip plugins.
- `--quality <eslint+prettier|biome>`  
  Code quality tool: `eslint+prettier` or `biome`.
- `--react <name>`  
  Directory name for a React frontend.
- `--script <ts|js|none>`  
  HTML scripting option: `ts`, `js`, or `none`.
- `--skip`  
  Skip non-required prompts and use `none` for all optional configurations.
- `--svelte <name>`  
  Directory name for a Svelte frontend.
- `--tailwind`  
  Include Tailwind CSS setup.
- `--tailwind-input <path>`  
  Path to your Tailwind CSS entry file.
- `--tailwind-output <path>`  
  Path for the generated Tailwind CSS bundle.
- `--vue <name>`  
  Directory name for a Vue frontend.

## Directory Configuration

Choose between the **default** layout (pre-configured folder names) or **custom**, which prompts you to specify each directory name yourself.

```bash
create-absolute --directory custom
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

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests to improve the CLI.

## License

Licensed under CC BY-NC 4.0.
