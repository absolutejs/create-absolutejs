#!/usr/bin/env node
import mri from 'mri'
import {
  cancel,
  isCancel,
  multiselect,
  outro,
  select,
  text
} from '@clack/prompts'
import colors from 'picocolors'

const { blueBright, yellow, cyan, green, magenta, red } = colors

const frameworkNames: Record<string, string> = {
  react: 'React',
  vue: 'Vue',
  svelte: 'Svelte',
  angular: 'Angular',
  solid: 'Solid',
  html: 'HTML',
  htmx: 'HTMX'
}

const argv = mri<{ help?: boolean }>(process.argv.slice(2), {
  alias: { h: 'help' },
  boolean: ['help']
})

const helpMessage = `
Usage: create-absolute [OPTION]...

Options:
  -h, --help    Show this help message and exit
`

async function init() {
  if (argv.help) {
    console.log(helpMessage.trim())
    process.exit(0)
  }

  const projectName = await text({
    message: 'Project name:',
    placeholder: 'absolutejs-project'
  })
  if (isCancel(projectName)) return cancel('Operation cancelled')

  const language = await select({
    message: 'Language:',
    options: [
      { label: blueBright('TypeScript'), value: 'ts' },
      { label: yellow('JavaScript'), value: 'js' }
    ]
  })
  if (isCancel(language)) return cancel()

  const frameworks = await multiselect({
    message: 'Framework(s) (space to select, enter to finish):',
    options: [
      { label: cyan('React'), value: 'react' },
      { label: green('Vue'), value: 'vue' },
      { label: magenta('Svelte'), value: 'svelte' },
      { label: red('Angular'), value: 'angular' },
      { label: blueBright('Solid'), value: 'solid' }
    ]
  })
  if (isCancel(frameworks)) return cancel()

  const buildDir = await text({
    message: 'Build directory:',
    placeholder: 'build'
  })
  if (isCancel(buildDir)) return cancel()

  const assetsDir = await text({
    message: 'Assets directory:',
    placeholder: 'src/backend/assets'
  })
  if (isCancel(assetsDir)) return cancel()

  const singleFramework = frameworks.length === 1
  const configs: {
    framework: string
    pagesDir: string
    indexDir: string
  }[] = []

  for (const fw of frameworks) {
    const pretty = frameworkNames[fw] ?? fw.charAt(0).toUpperCase() + fw.slice(1)
    const base = singleFramework
      ? 'src/frontend'
      : `src/frontend/${fw}`

    const defaultPages = `${base}/pages`
    const defaultIndex = `${base}/indexes`

    const pagesDir = await text({
      message: `${pretty} pages directory:`,
      placeholder: defaultPages
    })
    if (isCancel(pagesDir)) return cancel()

    const indexDir = await text({
      message: `${pretty} index directory:`,
      placeholder: defaultIndex
    })
    if (isCancel(indexDir)) return cancel()

    configs.push({ framework: fw, pagesDir, indexDir })
  }

  outro(`
  Project Name:     ${projectName}
  Language:         ${language === 'ts' ? 'TypeScript' : 'JavaScript'}
  Framework(s):     ${frameworks.join(', ')}
  Build Directory:  ${buildDir}
  Assets Directory: ${assetsDir}

  Framework Config:
    ${configs
      .map(
        ({ framework, pagesDir, indexDir }) => {
          const name = frameworkNames[framework] ?? framework
          return `${name} ⇒ pages: ${pagesDir}, index: ${indexDir}`
        }
      )
      .join('\n    ')}
  `)
}

init().catch((err) => {
  console.error(err)
  process.exit(1)
})
