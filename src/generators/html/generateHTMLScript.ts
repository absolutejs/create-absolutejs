import type { HTMLScriptOption } from '../../types';

export const getHTMLScript = (
	htmlScriptOption: HTMLScriptOption,
	isSingleFrontend: boolean
) => `import { HOURS_IN_DAY, TWO_THIRDS } from '${
	!isSingleFrontend ? '../' : ''
}../../constants';

const greeting = document.getElementById('greeting');
const date = new Date();
const hours = date.getHours();
if (!greeting) throw new Error('Greeting element not found');

if (hours < HOURS_IN_DAY / 2) {
  greeting.textContent = 'Good Morning, welcome to AbsoluteJS !';
} else if (hours < HOURS_IN_DAY * TWO_THIRDS) {
  greeting.textContent = 'Good Afternoon, welcome to AbsoluteJS !';
} else {
  greeting.textContent = 'Good Evening, welcome to AbsoluteJS !';
}

const button = document.getElementById('counter-button');
const counter = document.getElementById('counter');
if (!button || !counter) throw new Error('Button or counter element not found');
let count = 0;
button.addEventListener('click', () => {
  count++;
  counter.textContent = count.toString();
});

const links = document.querySelectorAll${htmlScriptOption === 'ts' ? '<HTMLAnchorElement>' : ''}('#links a');
links.forEach((link) => {
  link.addEventListener('mouseover', () => link.style.transform = 'scale(1.2)');
  link.addEventListener('mouseout',  () => link.style.transform = 'scale(1)');
});

const footerText = document.getElementById('footer-text');
if (!footerText) throw new Error('Footer text element not found');
footerText.textContent = \`© ${new Date().getFullYear()} AbsoluteJS\`;
`;
