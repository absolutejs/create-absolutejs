export const getPackageVersions = async (
	packageNames: string[]
): Promise<Map<string, string>> => {
	const results = await Promise.all(
		packageNames.map(async (name) => {
			try {
				const res = await fetch(
					`https://registry.npmjs.org/${name}/latest`
				);
				const data = (await res.json()) as { version: string };

				return [name, data.version] as const;
			} catch {
				return [name, null] as const;
			}
		})
	);

	const map = new Map<string, string>();
	for (const [name, version] of results) {
		if (version) map.set(name, version);
	}

	return map;
};
