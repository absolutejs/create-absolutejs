import { useState } from 'react';

export const Dropdown = () => {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<details
			onPointerEnter={() => setIsOpen(true)}
			onPointerLeave={() => setIsOpen(false)}
			open={isOpen}
		>
			<summary>Pages</summary>
			<nav>
				<a href="/react">React</a>
			</nav>
		</details>
	);
};
