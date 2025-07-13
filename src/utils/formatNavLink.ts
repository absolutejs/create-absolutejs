export const formatNavLink = (frontend: string) => {
	const displayText =
		frontend === 'html' || frontend === 'htmx'
			? frontend.toUpperCase()
			: frontend.charAt(0).toUpperCase() + frontend.slice(1);

	return `<a href="/${frontend}">${displayText}</a>` as const;
};
