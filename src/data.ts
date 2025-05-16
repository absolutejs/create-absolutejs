import { cyan, red, green, magenta, blueBright } from 'picocolors'
import type { FrontendFramework, AvailableDependency } from './types'

/* eslint-disable absolute/sort-keys-fixable */
export const availableFrontends: Record<string, FrontendFramework> = {
  react: { label: cyan('React'), name: 'React' },
  html: { label: 'HTML', name: 'HTML' },
  angular: { label: red('Angular'), name: 'Angular' },
  vue: { label: green('Vue'), name: 'Vue' },
  svelte: { label: magenta('Svelte'), name: 'Svelte' },
  htmx: { label: 'HTMX', name: 'HTMX' },
  solid: { label: blueBright('Solid'), name: 'Solid' }
}
/* eslint-enable absolute/sort-keys-fixable */

export const availablePlugins: AvailableDependency[] = [
  {
    value: '@elysiajs/static',
    label: cyan('📦 @elysiajs/static'),
    latestVersion: '1.3.0',
    imports: [
      { packageName: 'staticPlugin', isPlugin: true, config: null }
    ],
  },
  {
    value: '@elysiajs/cors',
    label: cyan('⚙️ @elysiajs/cors'),
    latestVersion: '1.3.3',
    imports: [
      { packageName: 'cors', isPlugin: true, config: null }
    ]
  },
  {
    value: '@elysiajs/swagger',
    label: cyan('📑 @elysiajs/swagger'),
    latestVersion: '1.3.0',
    imports: [
      { packageName: 'swagger', isPlugin: true, config: null },
    ]
  },
  {
    value: 'elysia-rate-limit',
    label: green('🛠️ elysia-rate-limit'),
    latestVersion: '4.3.0',
    imports: [
      { packageName: 'rateLimit', isPlugin: true, config: null }
    ]
  }
]

export const defaultDependencies: AvailableDependency[] = [
  {
    value: 'elysia',
    latestVersion: '1.3.0',
    imports: [
      { packageName: 'Elysia', isPlugin: false }
    ],
  }
]

export const defaultPlugins: AvailableDependency[] = [
  {
    value: '@absolutejs/absolute',
    latestVersion: '0.3.2',
    imports: [
      { packageName: 'build', isPlugin: false },
      { packageName: 'networkingPlugin', isPlugin: true }
    ],
  }
]
