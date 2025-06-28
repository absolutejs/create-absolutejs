import type { HTMLScriptOption } from '../../types';

export const generateHTMLPage = (htmlScriptOption: HTMLScriptOption) => {
	let scriptTag = '';
	if (htmlScriptOption === 'js') {
		scriptTag = `<script src="/html/scripts/javascriptExample.js"></script>`;
	} else if (htmlScriptOption === 'ts') {
		scriptTag = `<script src="/html/scripts/typescriptExample.ts"></script>`;
	}

	return `<!DOCTYPE html>
<html>
    <head>
        <title>Html Home</title>
        <link rel="stylesheet" type="text/css" href="/assets/css/HtmlHome.css">
        <link rel="icon" href="/assets/ico/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
    </head>
    <body>
        <header>
            <img id="logo" src="/assets/svg/brand_logo.svg" alt="AbsoluteJS Logo">
            <h1 id="greeting"></h1>
        </header>
        <main>
            <p>Welcome to AbsoluteJS, the next generation JavaScript framework. We're glad you're here.</p>
            <button id="counter-button">Click me!</button>
            <p id="counter">0</p>
            <nav id="links">
                <a href="/react" id="react-link">React</a>
                <a href="/vue" id="vue-link">Vue</a>
                <a href="/angular" id="angular-link">Angular</a>
                <a href="/svelte" id="svelte-link">Svelte</a>
                <a href="/ember" id="ember-link">Ember</a>
                <a href="/htmx" id="htmx-link">HTMX</a>
            </nav>
        </main>
        <footer>
            <p id="footer-text"></p>
        </footer>${
			scriptTag
				? `
        ${scriptTag}`
				: ''
		}
    </body>
</html>`;
};
