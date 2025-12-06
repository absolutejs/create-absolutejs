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

export const generateReactExamplePage =
	() => `import { App } from '../components/App';
    import { Dropdown } from '../components/Dropdown';
    import { Head } from '../components/Head';
    
    type ReactExampleProps = { initialCount: number; cssPath: string };
    
    export const ReactExample = ({ initialCount, cssPath }: ReactExampleProps) => (
        <html>
            <Head cssPath={cssPath} />
            <body>
                <header>
                    <a href="/">AbsoluteJS</a>
                    <Dropdown />
                </header>
                <App initialCount={initialCount} />
            </body>
        </html>
    );
    `;
