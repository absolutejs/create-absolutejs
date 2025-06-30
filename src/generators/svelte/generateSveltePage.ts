import type { Language } from '../../types';

export const generateSveltePage = (language: Language) => {
	const scriptTag = language === 'ts' ? `<script lang="ts">` : `<script>`;

	return `${scriptTag}
    let count = $state(0);

    const year = new Date().getFullYear();
</script>

<svelte:head>
    <meta charset="utf-8" />
    <title>Svelte Home</title>
    <meta name="description" content="Welcome to AbsoluteJS" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" href="/assets/ico/favicon.ico" />
</svelte:head>

<main>
    <header><h1>This page was built with Svelte</h1></header>

    <p>Welcome to the Svelte home page. This page was built using Svelte.</p>

    <p>Counter: {count}</p>
	<button onclick={() => (count += 1)}>Increment</button>

    <div id="links">
        <a href="/">Html</a>
        <a href="/vue">Vue</a>
    </div>

    <footer><p>© {year} AbsoluteJS</p></footer>
</main>
`;
};
