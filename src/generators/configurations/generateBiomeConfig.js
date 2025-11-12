// ESM shim so Node can import without a TS runner.
export function generateBiomeConfig({ frontends }) {
  const hasReact = frontends.some((f) => /react/i.test(f));
  const hasSvelte = frontends.some((f) => /svelte/i.test(f));
  const hasVue = frontends.some((f) => /vue/i.test(f));
  const hasHtmlOrHtmx = frontends.some((f) => /(html|htmx)/i.test(f));

  const exts = new Set(["js", "ts", "css", "json", "jsonc"]);
  if (hasReact) { exts.add("jsx"); exts.add("tsx"); }
  if (hasHtmlOrHtmx) exts.add("html");

  const includePattern = `**/*.{${Array.from(exts).join(",")}}`;
  const ignore = [
    "node_modules","dist","build","coverage",".next",".turbo",".vercel",
    ".cache",".output","tmp","out","pnpm-lock.yaml","yarn.lock"
  ];
  if (hasSvelte) ignore.push("**/*.svelte");
  if (hasVue) ignore.push("**/*.vue");

  const config = {
    $schema: "https://biomejs.dev/schemas/1.7.0/schema.json",
    files: { include: [includePattern], ignore },
    formatter: { enabled: true, indentStyle: "tab", indentWidth: 4, lineWidth: 80 },
    linter: {
      enabled: true,
      rules: {
        recommended: true,
        a11y: { recommended: true },
        performance: { recommended: true },
        security: { recommended: true },
        correctness: { noUnusedVariables: "warn" },
        complexity: { noUselessCatch: "warn" },
        style: { useBlockStatements: "error", noVar: "error", noParameterAssign: "warn" }
      }
    },
    javascript: { formatter: { quoteStyle: "single", semicolons: "always" } },
    typescript: { formatter: { quoteStyle: "single", semicolons: "always" } },
    organizeImports: { enabled: true },
    overrides: [
      { include: ["**/*.md","**/*.mdx"], formatter: { lineWidth: 80 } },
      { include: ["**/*.{yml,yaml}"], formatter: { indentStyle: "space", indentWidth: 2 } },
      { include: ["**/*.{json,jsonc}"], formatter: { indentStyle: "space", indentWidth: 2 } },
      ...(hasReact ? [{ include: ["**/*.{jsx,tsx}"], javascript: { formatter: { lineWidth: 100 } } }] : [])
    ]
  };

  return JSON.stringify(config, null, 2);
}

export default generateBiomeConfig;
