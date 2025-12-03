import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
	selector: 'app-dropdown',
	standalone: true,
	imports: [CommonModule],
	template: `
		<details class="dropdown">
			<summary>Menu</summary>
			<div class="menu">
				<a href="/">Home</a>
			</div>
		</details>
	`,
	styles: [`
		.dropdown {
			position: relative;
		}

		summary {
			cursor: pointer;
			padding: 0.5rem 1rem;
			background-color: #1a1a1a;
			border: 1px solid #333;
			border-radius: 0.25rem;
			list-style: none;
		}

		summary::-webkit-details-marker {
			display: none;
		}

		.menu {
			position: absolute;
			top: 100%;
			right: 0;
			margin-top: 0.5rem;
			background-color: #1a1a1a;
			border: 1px solid #333;
			border-radius: 0.25rem;
			min-width: 150px;
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		}

		.menu a {
			display: block;
			padding: 0.75rem 1rem;
			color: inherit;
			text-decoration: none;
			transition: background-color 0.2s;
		}

		.menu a:hover {
			background-color: #333;
		}

		@media (prefers-color-scheme: light) {
			summary {
				background-color: #f5f5f5;
				border-color: #ddd;
			}

			.menu {
				background-color: #ffffff;
				border-color: #ddd;
			}

			.menu a:hover {
				background-color: #f5f5f5;
			}
		}
	`]
})
export class DropdownComponent {}

