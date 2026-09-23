import { registryChannel } from './registryChannel';
// Opportunistic HTTP/2 multiplexing — npm registry is HTTPS + Promise.all
// fans out N package fetches over one TLS connection. The `protocol` option
// lands in @types/bun 1.3.14; widen locally for now.
type H2Init = RequestInit & { protocol?: 'http2' };
const h2IfHttps = (url: string) =>
	(url.startsWith('https://') ? { protocol: 'http2' } : {}) satisfies H2Init;

export const getPackageVersions = async (packageNames: string[]) => {
	const results = await Promise.all(
		packageNames.map(async (name) => {
			try {
				const target = `https://registry.npmjs.org/${encodeURIComponent(name)}/${registryChannel(name)}`;
				const res = await fetch(target, h2IfHttps(target));
				if (!res.ok)
					throw new Error(`Registry lookup failed for ${name}`);
				const data = (await res.json()) as { version: string };
				if (typeof data.version !== 'string')
					throw new Error(`Registry returned no version for ${name}`);

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
