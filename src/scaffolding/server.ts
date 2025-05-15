import { writeFileSync } from 'fs';
import type { AvailablePlugin } from '../types';

const defaultPlugins: AvailablePlugin[] = [
  { import: 'Elysia', value: 'elysia' }
];

export const createServerFile = (
  serverFilePath: string,
  availablePlugins: AvailablePlugin[],
  plugins: string[]
) => {
  // pick up any custom plugins the user selected
  const custom = availablePlugins.filter(p => plugins.includes(p.value));

  // merge defaultPlugins + custom without spread
  const merged = defaultPlugins.concat(custom);

  // dedupe by value, then sort alphabetically by module path
  const all = merged.reduce<AvailablePlugin[]>((acc, p) => {
    if (!acc.find(x => x.value === p.value)) {
      acc.push(p);
    }
    return acc;
  }, []).sort((a, b) => a.value.localeCompare(b.value));

  // build sorted import block
  const importLines = all
    .map(p => `import { ${p.import} } from '${p.value}';`)
    .join('\n');

  // build chained .use() calls for each custom plugin only
  const chainedUses = custom
    .map(p => `  .use(${p.import}())`)
    .join('\n');

  const content = `${importLines}

new Elysia()
  .get('/', () => 'Hello, world!')
${chainedUses}
  .listen(3000, () => {
    console.log('🚀 Server running at http://localhost:3000');
  });`;

  writeFileSync(serverFilePath, content);
};
