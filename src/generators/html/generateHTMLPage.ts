import { CreateConfiguration, Frontend } from '../../types';
import { formatNavLink } from '../../utils/formatNavLink';

export const generateHTMLPage = (
	frontends: Frontend[],
	useHTMLScripts: CreateConfiguration['useHTMLScripts']
) => {
	const navLinks = frontends.map(formatNavLink).join('\n\t\t\t');
	const initialCount = useHTMLScripts ? '0' : 'disabled';
	const scriptTagBlock = useHTMLScripts
		? `        <script src="../scripts/typescript-example.ts"></script>\n`
		: '';

	return `<!doctype html>
<html>
    <head>
        <title>AbsoluteJS + HTML</title>
        <meta name="description" content="AbsoluteJS HTML Example" />
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
            rel="stylesheet"
            type="text/css"
            href="../styles/html-example.css"
        />
        <link rel="icon" href="/assets/ico/favicon.ico" />
    </head>
    <body>
        <header>
            <a href="/">AbsoluteJS</a>
            <details>
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
                <a href="https://html.spec.whatwg.org/multipage/">
                    <img
                        class="logo html"
                        src="/assets/svg/HTML5_Badge.svg"
                        alt="HTML Logo"
                    />
                </a>
            </nav>
            <h1>AbsoluteJS + HTML</h1>
            <button id="counter-button">
                count is <span id="counter">${initialCount}</span>
            </button>
            <p>
                Edit <code>example/html/pages/HtmlExample.html</code> save and
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
${scriptTagBlock}    </body>
</html>
`;
};
