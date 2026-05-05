import { Frontend } from '../../types';
import { formatNavLink } from '../../utils/formatNavLink';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const generateAngularPage = (_frontends: Frontend[]) =>
	`import { Component, inject, InjectionToken } from '@angular/core';
import { CommonModule } from '@angular/common';
import { defineAngularPage } from '@absolutejs/absolute/angular';
import { DropdownComponent } from '../components/dropdown.component';
import { AppComponent } from '../components/app.component';

export const INITIAL_COUNT = new InjectionToken<number>('INITIAL_COUNT');

type AngularPageProps = {
	initialCount: number;
};

@Component({
	imports: [CommonModule, DropdownComponent, AppComponent],
	selector: 'angular-page',
	standalone: true,
	templateUrl: '../templates/angular-example.html'
})
export class AngularExampleComponent {
	initialCount: number = 0;

	constructor() {
		const initialCountToken = inject(INITIAL_COUNT, { optional: true });
		this.initialCount = initialCountToken ?? 0;
	}
}

export const page = defineAngularPage<AngularPageProps>({
	component: AngularExampleComponent
});
`;

export const generateAngularPageHtml = () => `<header>
	<a href="/">AbsoluteJS</a>
	<app-dropdown></app-dropdown>
</header>
<app-root [initialCount]="initialCount"></app-root>
`;

export const generateAppComponent = (
	isSingleFrontend: boolean
) => `import { Component, Input, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CounterComponent } from './counter.component';

@Component({
	selector: 'app-root',
	standalone: true,
	imports: [CommonModule, CounterComponent],
	templateUrl: '../templates/app.component.html',
	styleUrl: '${isSingleFrontend ? '../' : '../../'}styles/app.component.css',
	encapsulation: ViewEncapsulation.None
})
export class AppComponent {
	@Input() initialCount: number = 0;
}
`;

export const generateAppComponentCss = () => ``;

export const generateAppComponentHtml = (
	frontends: Frontend[],
	editBasePath: string
) => {
	const exploreBlock =
		frontends.length > 1
			? `\n\t<p style="margin-top: 2rem">\n\t\tExplore the other pages to see multiple frameworks running\n\t\ttogether.\n\t</p>`
			: '';

	return `<main>
	<nav>
		<a href="https://absolutejs.com" target="_blank">
			<img
				class="logo"
				src="/assets/png/absolutejs-temp.png"
				alt="AbsoluteJS Logo"
			/>
		</a>
		<a href="https://angular.dev/">
			<img
				class="logo angular"
				src="/assets/svg/angular.svg"
				alt="Angular Logo"
			/>
		</a>
	</nav>
	<h1>AbsoluteJS + Angular</h1>
	<app-counter [initialCount]="initialCount"></app-counter>
	<p>
		Edit <code>${editBasePath}/pages/angular-example.ts</code> and save to
		test HMR.
	</p>${exploreBlock}
	<p style="color: #777; font-size: 1rem; margin-top: 2rem">
		Click on the AbsoluteJS and Angular logos to learn more.
	</p>
</main>
`;
};

export const generateCounterComponent = (
	isSingleFrontend: boolean
) => `import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
	selector: 'app-counter',
	standalone: true,
	imports: [CommonModule],
	templateUrl: '../templates/counter.component.html',
	styleUrl: '${isSingleFrontend ? '../' : '../../'}styles/counter.component.css'
})
export class CounterComponent {
	@Input() initialCount: number = 0;
	count: number = 0;

	ngOnInit() {
		this.count = this.initialCount;
	}

	increment() {
		this.count++;
	}
}
`;

export const generateCounterComponentHtml =
	() => `<button (click)="increment()">
	count is <span class="counter-value">{{ count }}</span>
</button>
`;

export const generateCounterComponentCss = () => `button {
	background-color: #1a1a1a;
	border: 1px solid transparent;
	border-radius: 0.5rem;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	cursor: pointer;
	font-family: inherit;
	font-size: 1.1rem;
	font-weight: 500;
	margin: 2rem 0;
	padding: 0.6rem 1.2rem;
	transition: border-color 0.25s;
}
button:hover {
	border-color: #dd0031;
}
button:focus,
button:focus-visible {
	outline: 4px auto -webkit-focus-ring-color;
}

@media (prefers-color-scheme: light) {
	button {
		background-color: #ffffff;
	}
}
`;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const generateDropdownComponent = (_frontends: Frontend[]) => {
	return `import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
	selector: 'app-dropdown',
	standalone: true,
	imports: [CommonModule],
	templateUrl: '../templates/dropdown.component.html'
})
export class DropdownComponent {
	isOpen = false;
}
`;
};

export const generateDropdownComponentHtml = (frontends: Frontend[]) => {
	const navLinks = frontends.map(formatNavLink).join('\n\t\t');

	return `<details
	class="dropdown"
	[attr.open]="isOpen ? '' : null"
	(mouseenter)="isOpen = true"
	(mouseleave)="isOpen = false"
>
	<summary>Pages</summary>
	<nav class="menu">
		${navLinks}
	</nav>
</details>
`;
};
