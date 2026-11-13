/* Opens the Pages menu on mouse hover. It lives here rather than in inline
   onpointerenter/onpointerleave attributes because secureHeaders()'s CSP
   blocks inline event handlers. */
const pagesMenu = document.querySelector<HTMLDetailsElement>('header details');

pagesMenu?.addEventListener('pointerenter', (event) => {
	if (event.pointerType === 'mouse') {
		pagesMenu.open = true;
	}
});

pagesMenu?.addEventListener('pointerleave', (event) => {
	if (event.pointerType === 'mouse') {
		pagesMenu.open = false;
	}
});
