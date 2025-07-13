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
Usage: create-absolute [options] [project-name]
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

- `--angular-dir <dir>`  
  Specify the directory for and use the Angular frontend.

- `--assets <dir>`  
  Directory name for your static assets.

- `--auth <plugin|none>`  
  Pre-configured auth plugin (currently only `absolute-auth`) or `none`.

- `--biome`  
  Use Biome for code quality and formatting.

- `--build <dir>`  
  Output directory for build artifacts.

- `--database <dir>`  
  Directory name for your database files.

- `--directory <default|custom>`  
  Directory-naming strategy: `default` or `custom`.

- `--engine <engine|none>`  
  Database engine (`postgresql` | `mysql` | `sqlite` | `mongodb` | `redis` | `singlestore` | `cockroachdb` | `mssql`) or `none`.

- `--eslint+prettier`  
  Use ESLint + Prettier for code quality and formatting.

- `--git`  
  Initialize a Git repository.

- `--host <provider|none>`  
  Database host provider (`neon` | `planetscale` | `supabase` | `turso` | `vercel` | `upstash` | `atlas`) or `none`.

- `--html`  
  Include a plain HTML frontend.

- `--html-dir <dir>`  
  Specify the directory for and use the HTML frontend.

- `--html-script`  
  Enable experimental HTML scripting with TypeScript.

- `--htmx`  
  Include an HTMX frontend.

- `--htmx-dir <dir>`  
  Specify the directory for and use the HTMX frontend.

- `--install`  
  Use the same package manager to install dependencies.

- `--lts`  
  Use LTS versions of required packages.

- `--orm <drizzle|prisma|none>`  
  ORM to configure: `drizzle` | `prisma` | `none`.

- `--plugin <plugin>`  
  Elysia plugin(s) to include (repeatable); `none` skips plugin setup.

- `--react`  
  Include a React frontend.

- `--react-dir <dir>`  
  Specify the directory for and use the React frontend.

- `--skip`  
  Skip non-required prompts; uses `none` for all optional configs.

- `--svelte`  
  Include a Svelte frontend.

- `--svelte-dir <dir>`  
  Specify the directory for and use the Svelte frontend.

- `--tailwind`  
  Include Tailwind CSS setup.

- `--tailwind-input <file>`  
  Path to your Tailwind CSS entry file.

- `--tailwind-output <file>`  
  Path for the generated Tailwind CSS bundle.

- `--vue`  
  Include a Vue frontend.

- `--vue-dir <dir>`  
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

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests to improve the CLI.

## License

Licensed under CC BY-NC 4.0.
