import {
	defaultDependencies,
	defaultPlugins,
	absoluteAuthPlugin,
	scopedStatePlugin,
	availablePlugins
} from '../../data';
import type { CreateConfiguration } from '../../types';
import type { FrameworkFlags } from './computeFlags';

type CollectDependenciesProps = {
	plugins: string[];
	authOption: CreateConfiguration['authOption'];
	flags: FrameworkFlags;
};

export const collectDependencies = ({
	plugins,
	authOption,
	flags
}: CollectDependenciesProps) => {
	const customSelections = availablePlugins.filter((plugin) =>
		plugins.includes(plugin.value)
	);
	const authPlugins = authOption === 'abs' ? [absoluteAuthPlugin] : [];
	const htmxPlugins = flags.requiresHtmx ? [scopedStatePlugin] : [];

	const allDeps = [
		...defaultDependencies,
		...defaultPlugins,
		...customSelections,
		...authPlugins,
		...htmxPlugins
	];

	const uniqueDeps = Array.from(
		new Map(
			allDeps.map((dependency) => [dependency.value, dependency])
		).values()
	);

	uniqueDeps.sort((firstDep, secondDep) =>
		firstDep.value.localeCompare(secondDep.value)
	);

	return uniqueDeps;
};
