import { styleReset } from "../../styles/default/pageDefault";

type HeadProps = {
	title?: string;
	icon?: string;
	font?: string;
};

export const Head = ({
	title = 'AbsoluteJS',
	icon = '/assets/ico/favicon.ico',
	font = 'Poppins'
}: HeadProps) => (
	<head>
		<meta charSet="utf-8" />
		<title>{title}</title>
		<meta name="description" content="Bun, Elysia & React" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<link rel="icon" href={icon} />
		<link rel="preconnect" href="https://fonts.googleapis.com" />
		<link
			rel="preconnect"
			href="https://fonts.gstatic.com"
			crossOrigin="anonymous"
		/>
		<link
			href={`https://fonts.googleapis.com/css2?family=${font}:wght@100..900&display=swap`}
			rel="stylesheet"
		/>
		<style>{styleReset}</style>
	</head>
);
