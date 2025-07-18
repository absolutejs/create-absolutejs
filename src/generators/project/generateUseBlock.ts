import type { AvailableDependency } from '../../types';

export const generateUseBlock = (deps: AvailableDependency[]) =>
	deps
		.flatMap((dependency) => dependency.imports ?? [])
		.filter((pluginImport) => pluginImport.isPlugin)
		.map((pluginImport) => {
			if (pluginImport.config === undefined) {
				return `.use(${pluginImport.packageName})`;
			}
			if (pluginImport.config === null) {
				return `.use(${pluginImport.packageName}())`;
			}

			return `.use(${pluginImport.packageName}(${JSON.stringify(pluginImport.config)}))`;
		})
		.join('\n');
