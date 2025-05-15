import { execSync } from 'child_process';

export const getPackageVersion = (packageName: string) => {
	try {
		const raw = execSync(
			`curl -s https://registry.npmjs.org/${packageName}/latest`
		);

		const { version }: { version: string } = JSON.parse(raw.toString());

		return version;
	} catch (err) {
		console.error(`Error fetching version for ${packageName}:`, err);

		return null;
	}
};
