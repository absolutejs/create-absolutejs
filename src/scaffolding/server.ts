import { writeFileSync } from 'fs'
import { defaultDependencies, defaultPlugins } from '../data'
import type { AvailableDependency } from '../types'

export const createServerFile = (
  serverFilePath: string,
  availablePlugins: AvailableDependency[],
  plugins: string[]
) => {
  const custom = availablePlugins.filter(p => plugins.includes(p.value))
  const allDeps = defaultDependencies.concat(defaultPlugins, custom)

  const uniqueDeps = allDeps
    .reduce<AvailableDependency[]>((acc, dep) => {
      if (!acc.find(e => e.value === dep.value)) acc.push(dep)
      return acc
    }, [])
    .sort((a, b) => a.value.localeCompare(b.value))

  // group imports by package
  const importLines = uniqueDeps
    .map(dep => {
      const names = dep.imports.map(i => i.packageName).join(', ')
      return `import { ${names} } from '${dep.value}';`
    })
    .join('\n')

  const uses = uniqueDeps
    .flatMap(dep =>
      dep.imports
        .filter(i => i.isPlugin)
        .map(i => {
          const fn = i.packageName
          if (i.config === undefined) {
            return `\t.use(${fn})`
          } else if (i.config === null) {
            return `\t.use(${fn}())`
          } else {
            return `\t.use(${fn}(${JSON.stringify(i.config)}))`
          }
        })
    )
    .join('\n')

  const content = `\
${importLines}

new Elysia()
\t.get('/', () => 'Hello, world!')
${uses}
\t.on("error", (error) => {
\t\tconst { request } = error
\t\tconsole.error(\`Server error on \${request.method} \${request.url}: \${error.message}\`)
\t})`

  writeFileSync(serverFilePath, content)
}
