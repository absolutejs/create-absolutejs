/* The React and Svelte starters set their text in Poppins, self-hosted by
 * AbsoluteJS's `fonts` build config: the build downloads it once, serves it
 * from the app's own origin (so a strict Content-Security-Policy such as
 * secureHeaders()' needs nothing extra) and adds a metric-matched fallback.
 * The pages get the stylesheet and preload through `fontAssets(manifest)`.
 *
 * Weights: 400 body text, 500 links and buttons, 600 the auth profile
 * initials, 700 headings. Browsers fetch only the faces a page uses; the
 * build preloads 400. */
const STARTER_FONT_WEIGHTS = '400, 500, 600, 700';

/* `injectHtml: false`: HTML and HTMX pages don't use Poppins, so they
 * shouldn't preload it. */
export const starterFontConfig = `fonts: {
\t\tfamilies: [{ family: 'Poppins', weights: [${STARTER_FONT_WEIGHTS}] }],
\t\tinjectHtml: false
\t}`;

/* Appended to the starter's stylesheet. The fallback list (the reset's own
 * stack) applies if the font stylesheet is missing. */
export const starterFontCSS = `
html {
	font-family: var(
		--font-poppins,
		system-ui,
		Avenir,
		Helvetica,
		Arial,
		sans-serif
	);
}
`;
