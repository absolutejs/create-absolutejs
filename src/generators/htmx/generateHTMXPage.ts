import { Frontend } from '../../types';
import { formatNavLink } from '../../utils/formatNavLink';

export const generateHTMXPage = (isSingle: boolean, frontends: Frontend[]) => {
	const navLinks = frontends.map(formatNavLink).join('\n\t\t\t');

	return `<!doctype html>
<html>
	<head>
		<title>AbsoluteJS + HTMX</title>
		<meta name="description" content="AbsoluteJS HTMX Example" />
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<link
			rel="stylesheet"
			type="text/css"
			href="../styles/htmx-example.css"
		/>
		<link rel="icon" href="/assets/ico/favicon.ico" />
		<script src="${isSingle ? '' : '/htmx'}/htmx.min.js"></script>
	</head>
	<body
		hx-post="/htmx/reset"
		hx-trigger="beforeunload from:window once"
		hx-swap="none"
	>
		<header>
			<a href="/">AbsoluteJS</a>
			<details
				hx-on:pointerenter="this.open = true"
				hx-on:pointerleave="this.open = false"
			>
				<summary>Pages</summary>
				<nav>
					${navLinks}
				</nav>
			</details>
		</header>
		<main>
			<nav>
				<a href="https://absolutejs.com" target="_blank">
					<img
						class="logo"
						src="/assets/png/absolutejs-temp.png"
						alt="AbsoluteJS Logo"
					/>
				</a>
				<a href="https://htmx.org" target="_blank">
					<picture>
						<source
							srcset="/assets/svg/htmx-logo-white.svg"
							media="(prefers-color-scheme: dark)"
						/>

						<img
							src="/assets/svg/htmx-logo-black.svg"
							alt="HTMX logo"
							class="logo htmx"
						/>
					</picture>
				</a>
			</nav>
			<h1>AbsoluteJS + HTMX</h1>
			<button
				hx-post="/htmx/increment"
				hx-target="#count"
				hx-swap="innerHTML"
			>
				count is
				<span
					id="count"
					hx-get="/htmx/count"
					hx-trigger="load"
					hx-swap="innerHTML"
					>0</span
				>
			</button>
			<p>
				Edit <code>example/htmx/pages/HtmxHome.html</code> save and
				rebuild to update the page.
			</p>
			<p style="color: #777">( Hot Module Reloading is coming soon )</p>
			<p style="margin-top: 2rem">
				Explore the other pages to see how AbsoluteJS seamlessly unifies
				multiple frameworks on a single server.
			</p>
			<p style="margin-top: 2rem; font-size: 1rem; color: #777">
				Click on the AbsoluteJS and HTML logos to learn more.
			</p>
		</main>
	</body>
</html>
`;
};
