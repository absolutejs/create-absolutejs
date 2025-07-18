import {
  defaultDependencies,
  defaultPlugins,
  absoluteAuthPlugin,
  scopedStatePlugin,
  availablePlugins
} from '../../data'
import type { CreateConfiguration } from '../../types'
import type { FrameworkFlags } from './computeFlags'

type CollectDependenciesProps = {
  plugins: string[]
  authProvider: CreateConfiguration['authProvider']
  flags: FrameworkFlags
}

export const collectDependencies = ({
  plugins,
  authProvider,
  flags
}: CollectDependenciesProps) => {
  const customSelections = availablePlugins.filter(plugin =>
    plugins.includes(plugin.value)
  )
  const authPlugins = authProvider === 'absoluteAuth'
    ? [absoluteAuthPlugin]
    : []
  const htmxPlugins = flags.requiresHtmx
    ? [scopedStatePlugin]
    : []

  const allDeps = [
    ...defaultDependencies,
    ...defaultPlugins,
    ...customSelections,
    ...authPlugins,
    ...htmxPlugins
  ]

  const uniqueDeps = Array.from(
    new Map(allDeps.map(dependency => [dependency.value, dependency])).values()
  )

  uniqueDeps.sort((firstDep, secondDep) =>
    firstDep.value.localeCompare(secondDep.value)
  )

  return uniqueDeps
}
