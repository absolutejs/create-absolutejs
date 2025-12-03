import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
	selector: 'app-head',
	standalone: true,
	imports: [CommonModule],
	template: `
		<head>
			<meta charset="UTF-8" />
			<link rel="icon" type="image/x-icon" href="/assets/ico/favicon.ico" />
			<meta name="viewport" content="width=device-width, initial-scale=1.0" />
			<title>AbsoluteJS</title>
			<link rel="stylesheet" [href]="cssPath" />
		</head>
	`
})
export class HeadComponent {
	@Input() cssPath: string = '';
}

