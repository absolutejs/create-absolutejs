

export type GenerateBiomeConfigOptions = {
  frontends: string[]; // e.g. ["react", "svelte", "vue", "html", "htmx", "vanilla"]
  // Optional future style knobs could go here (lineWidth, semicolons, etc.)
};

/**
 * Returns a JSON string for biome.json based on selected frontends.
 * - React: enables JSX/TSX includes and a wider line width for JSX formatting.
 * - Svelte/Vue: currently excluded from Biome scope (ignored patterns) until verified.
 * - HTML/HTMX: covered by including "html" in the handled extensions.
 */
export function generateBiomeConfig({ frontends }: GenerateBiomeConfigOptions): string {
  const hasReact = frontends.some((f) => /react/i.test(f));
  const hasSvelte = frontends.some((f) => /svelte/i.test(f));
  const hasVue = frontends.some((f) => /vue/i.test(f));
  const hasHtmlOrHtmx = frontends.some((f) => /(html|htmx)/i.test(f));

  // Build the set of extensions Biome will handle
  const exts = new Set<string>(["js", "ts", "css", "json", "jsonc"]);
  if (hasReact) {
    exts.add("jsx");
    exts.add("tsx");
  }
  if (hasHtmlOrHtmx) {
    exts.add("html");
  }

  // Files include and ignore lists
  const includePattern = `**/*.{${Array.from(exts).join(",")}}`;
  const ignore: string[] = [
    "node_modules",
    "dist",
    "build",
    "coverage",
    ".next",
    ".turbo",
    ".vercel",
    ".cache",
    ".output",
    "tmp",
    "out",
    "pnpm-lock.yaml",
    "yarn.lock"
  ];

  // Until Svelte/Vue support is verified, keep them out of Biome scope
  if (hasSvelte) ignore.push("**/*.svelte");
  if (hasVue) ignore.push("**/*.vue");

  const config = {
    $schema: "https://biomejs.dev/schemas/1.7.0/schema.json",
    files: {
      include: [includePattern],
      ignore
    },
    formatter: {
      enabled: true,
      indentStyle: "tab",
      indentWidth: 4,
      lineWidth: 80
    },
    linter: {
      enabled: true,
      rules: {
        recommended: true,
        a11y: { recommended: true },
        performance: { recommended: true },
        security: { recommended: true },
        correctness: { noUnusedVariables: "warn" },
        complexity: { noUselessCatch: "warn" },
        style: {
          useBlockStatements: "error",
          noVar: "error",
          noParameterAssign: "warn"
        }
      }
    },
    javascript: {
      formatter: {
        quoteStyle: "single",
        semicolons: "always"
      }
    },
    typescript: {
      formatter: {
        quoteStyle: "single",
        semicolons: "always"
      }
    },
    organizeImports: { enabled: true },
    overrides: [
      // Markdown (not in include by default, but harmless if present)
      {
        include: ["**/*.md", "**/*.mdx"],
        formatter: { lineWidth: 80 }
      },
      // YAML
      {
        include: ["**/*.{yml,yaml}"],
        formatter: { indentStyle: "space", indentWidth: 2 }
      },
      // JSON
      {
        include: ["**/*.{json,jsonc}"],
        formatter: { indentStyle: "space", indentWidth: 2 }
      },
      // React JSX/TSX ergonomics
      ...(hasReact
        ? [
            {
              include: ["**/*.{jsx,tsx}"],
              javascript: {
                formatter: {
                  lineWidth: 100
                }
              }
            }
          ]
        : [])
    ]
  };

  return JSON.stringify(config, null, 2);
}

export default generateBiomeConfig;
