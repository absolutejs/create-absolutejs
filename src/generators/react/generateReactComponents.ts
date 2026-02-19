import { ProviderOption } from '@absolutejs/auth';
import { AuthOption, Frontend } from '../../types';
import { formatNavLink } from '../../utils/formatNavLink';

export const generateAppComponent = (frontends: Frontend[]) => {
	const exploreBlock =
		frontends.length > 1
			? `\n\t\t\t<p style={{ marginTop: '2rem' }}>\n\t\t\t\tExplore the other pages to see multiple frameworks running\n\t\t\t\ttogether.\n\t\t\t</p>`
			: '';

	return `import { useState } from 'react';

type AppProps = { initialCount: number };

export const App = ({ initialCount }: AppProps) => {
	const [count, setCount] = useState(initialCount);

	return (
		<main>
			<nav>
				<a href="https://absolutejs.com" target="_blank">
					<img
						className="logo"
						src="/assets/png/absolutejs-temp.png"
						alt="AbsoluteJS Logo"
					/>
				</a>
				<a href="https://react.dev/">
					<img
						className="logo react"
						src="/assets/svg/react.svg"
						alt="React Logo"
					/>
				</a>
			</nav>
			<h1>AbsoluteJS + React</h1>
			<button onClick={() => setCount(count + 1)}>
				count is {count}
			</button>
			<p>
				Edit <code>example/react/pages/ReactExample.tsx</code> and save
				to test HMR.
			</p>${exploreBlock}
			<p
				style={{
					color: '#777',
					fontSize: '1rem',
					marginTop: '2rem'
				}}
			>
				Click on the AbsoluteJS and React logos to learn more.
			</p>
		</main>
	);
};
`;
};

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

export const generateSignInComponent = (
	absProviders: ProviderOption[] | undefined
) => `import { useState } from 'react';
import { OAuthLink } from './OAuthLink';

export const SignIn = () => {
	const [isOpen, setIsOpen] = useState(false);
	
	return (
		<details
			onPointerEnter={() => setIsOpen(true)}
			onPointerLeave={() => setIsOpen(false)}
			open={isOpen}
		>
			<summary>Sign In</summary>
			<nav>
				${
					absProviders && absProviders.length > 0
						? absProviders
								.map((provider) => {
									const logoUrl = `/assets/svg/google-logo.svg`;
									const name =
										provider.charAt(0).toUpperCase() +
										provider.slice(1).toLowerCase();

									return `<OAuthLink provider="${provider}" logoUrl="${logoUrl}" name="${name}" mode="in" />`;
								})
								.join('\n\t\t\t')
						: `<p>No OAuth providers configured</p>`
				}
			</nav>
		</details>
	);
}
`;

export const generateReactExamplePage = (authOption: AuthOption) => {
	const useBlockReturn = authOption === 'abs';

	const propsType = `
		type ReactExampleProps = { 
			initialCount: number; 
			cssPath: string;
			${authOption === 'abs' ? 'user: User | null;\n\tproviderConfiguration: ProviderConfiguration | undefined;' : ''}
		};
	`;

	const fnSignature =
		authOption === 'abs'
			? `export const ReactExample = ({ initialCount, cssPath, user, providerConfiguration }: ReactExampleProps) => {`
			: `export const ReactExample = ({ initialCount, cssPath }: ReactExampleProps) => (`;

	const extractProps = `	const userImage =
		user?.metadata && providerConfiguration?.picture
			? extractPropFromIdentity(
					user.metadata,
					providerConfiguration.picture,
					'string'
				)
			: undefined;

	const givenName =
		user?.metadata && providerConfiguration?.givenName
			? extractPropFromIdentity(
					user.metadata,
					providerConfiguration.givenName,
					'string'
				)
			: undefined;

	const familyName =
		user?.metadata && providerConfiguration?.familyName
			? extractPropFromIdentity(
					user.metadata,
					providerConfiguration.familyName,
					'string'
				)
			: undefined;`;

	const userButtonsBlock =
		authOption === 'abs'
			? `{user ? <ProfilePicture userImage={userImage} givenName={givenName} familyName={familyName} /> : <SignIn />}`
			: ``;

	const rightGroup =
		authOption === 'abs'
			? `<div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
						<Dropdown />
						${userButtonsBlock}
					</div>`
			: `<Dropdown />`;

	const closing = authOption === 'abs' ? `};` : `);`;

	return `
${authOption === 'abs' ? `import { User } from '../../../types/databaseTypes';\nimport { extractPropFromIdentity, ProviderConfiguration } from '@absolutejs/auth';` : ''}
import { App } from '../components/App';
import { Dropdown } from '../components/Dropdown';
import { Head } from '../components/Head';
${authOption === 'abs' ? `import { ProfilePicture } from '../components/ProfilePicture';\nimport { SignIn } from '../components/SignIn';` : ''}

${propsType}

${fnSignature}
${authOption === 'abs' ? extractProps : ''}
    ${useBlockReturn ? 'return (' : ''}
        <html>
            <Head cssPath={cssPath} />
            <body>
                <header>
                    <a href="/">AbsoluteJS</a>
                    ${rightGroup}
                </header>
                <App initialCount={initialCount} />
            </body>
        </html>
    ${useBlockReturn ? ');' : ''}
${closing}
`;
};
