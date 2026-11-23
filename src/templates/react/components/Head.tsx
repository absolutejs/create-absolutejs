import type { FontAssets } from '@absolutejs/absolute';

type HeadProps = {
	title?: string;
	description?: string;
	icon?: string;
	/* Self-hosted fonts from absolute.config.ts: pass `fontAssets(manifest)`. */
	fonts?: FontAssets;
	cssPath?: string;
};

export const Head = ({
	title = 'AbsoluteJS + React',
	description = 'AbsoluteJS React Example',
	icon = '/assets/ico/favicon.ico',
	fonts,
	cssPath
}: HeadProps) => (
	<head>
		<meta charSet="utf-8" />
		<title>{title}</title>
		<meta content={description} name="description" />
		<meta content="width=device-width, initial-scale=1" name="viewport" />
		<link href={icon} rel="icon" />
		{fonts?.preload.map((href) => (
			<link
				as="font"
				crossOrigin="anonymous"
				href={href}
				key={href}
				rel="preload"
			/>
		))}
		{fonts?.stylesheets.map((href) => (
			<link href={href} key={href} rel="stylesheet" />
		))}
		{cssPath && <link href={cssPath} rel="stylesheet" type="text/css" />}
	</head>
);
