import { Frontend } from '../../types';
import { formatNavLink } from '../../utils/formatNavLink';

export const generateDropdownComponent = (frontends: Frontend[]) => {
	const navLinks = frontends.map(formatNavLink).join('\n\t\t\t');

	return `import { useState } from 'react';
      
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
                    ${navLinks}
                </nav>
            </details>
        );
      };
      `;
};
