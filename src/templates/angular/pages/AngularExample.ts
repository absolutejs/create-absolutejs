import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeadComponent } from '../components/head.component';
import { DropdownComponent } from '../components/dropdown.component';
import { AppComponent } from '../components/app.component';

type AngularPageProps = {
	initialCount: number;
	cssPath: string;
};

@Component({
	selector: 'html',
	standalone: true,
	imports: [CommonModule, HeadComponent, DropdownComponent, AppComponent],
	template: `
		<app-head [cssPath]="cssPath"></app-head>
		<body>
			<header>
				<a href="/">AbsoluteJS</a>
				<app-dropdown></app-dropdown>
			</header>
			<app-root [initialCount]="initialCount"></app-root>
		</body>
	`
})
export class AngularExampleComponent {
	initialCount: number = 0;
	cssPath: string = '';
}

export const AngularExample = (props: AngularPageProps) => {
	const component = new AngularExampleComponent();
	component.initialCount = props.initialCount;
	component.cssPath = props.cssPath;
	return component;
};

