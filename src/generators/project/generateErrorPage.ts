/* The error.html convention page for the HTML and HTMX pages directories.
 * AbsoluteJS renders it, with status 500, when a route throws while serving
 * a page request, and logs the error on the server. {{ name }} and
 * {{ message }} are filled in, HTML-escaped (outside development the message
 * is a generic one); {{ stack }} is empty outside development. */
export const generateErrorPage = (title: string, cssHref: string) =>
	`<!doctype html>
<html>
	<head>
		<title>Something went wrong | ${title}</title>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<link rel="stylesheet" type="text/css" href="${cssHref}" />
		<link rel="icon" href="/assets/ico/favicon.ico" />
	</head>
	<body>
		<header>
			<a href="/">AbsoluteJS</a>
		</header>
		<main>
			<h1>Something went wrong</h1>
			<p>{{ message }}</p>
			<pre>{{ stack }}</pre>
			<p><a href="/">Back to the home page</a></p>
		</main>
	</body>
</html>
`;
