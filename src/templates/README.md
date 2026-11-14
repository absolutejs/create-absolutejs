# `<project-name>`

> ⚡️ This project was scaffolded with the **AbsoluteJS CLI** — your one-stop tool for bootstrapping modern TypeScript & JavaScript applications.

---

## Overview

This boilerplate gives you a head-start with:

- ✅ **TypeScript** or **JavaScript** support
- 🔍 **ESLint + Prettier** (or Biome, coming soon)
- 🎨 **Tailwind CSS** integration (optional)
- 📦 A sensible project layout (frontend & backend folders)
- 📄 Preconfigured `tsconfig.json`, `eslint.config.mjs`, and Prettier settings
- ⚙️ Git initialization ready to go

---

## Getting Started

```bash
# 1. Enter your project folder
cd <project-name>

# 2. Install dependencies
#    (using your package manager of choice: npm, yarn, pnpm, or bun)
bun install

# 3. Start the development server
bun run dev

# 4. Build for production
bun run build
```

### Type checking

`bun run typecheck` runs `absolute typecheck`, which checks TypeScript and each
framework's components. Vue components are checked with vue-check, which comes
with AbsoluteJS, on Bun 1.4.4 or newer. On older Bun, or with
`ABSOLUTE_TYPECHECK_CHECKER=tsc`, it uses `vue-tsc` instead, which is why Vue
projects list it in `devDependencies`. On Bun 1.4.4+ you can remove it.
