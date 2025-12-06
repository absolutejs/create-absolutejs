import { ProviderOption } from 'citra';

type OAuthLinkProps = {
	logoUrl: string;
	name: string;
	provider: Lowercase<ProviderOption> | undefined;
	mode: 'in' | 'up';
};

export const OAuthLink = ({
	provider,
	logoUrl,
	name,
	mode
}: OAuthLinkProps) => {
	const buttonText = `Sign ${mode} with ${name}`;

	return (
		<a
			style={{
				alignItems: 'center',
				display: 'flex',
				gap: '0.5rem'
			}}
			href={provider ? `/oauth2/${provider}/authorization` : undefined}
		>
			{provider ? (
				<img
					style={{ height: '2rem', width: '2rem' }}
					alt={`${name} logo`}
					src={logoUrl}
				/>
			) : (
				<p>Provider not configured</p>
			)}
			<span>{buttonText}</span>
		</a>
	);
};
