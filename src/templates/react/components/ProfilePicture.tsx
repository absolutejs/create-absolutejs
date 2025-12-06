type ProfilePictureProps = {
	userImage: string | null | undefined;
	givenName?: string;
	familyName?: string;
	color?: string;
	width?: string;
	height?: string;
	fontSize?: string;
};

export const ProfilePicture = ({
	userImage,
	givenName = '',
	familyName = '',
	color = '#4285F4',
	width = '2rem',
	height = '2rem',
	fontSize = '0.85rem'
}: ProfilePictureProps) => {
	if (userImage) {
		return (
			<img
				alt="Profile"
				src={userImage}
				style={{
					borderRadius: '50%',
					height,
					objectFit: 'cover',
					width
				}}
			/>
		);
	}

	const initials = `${givenName.charAt(0).toUpperCase()}${familyName.charAt(0).toUpperCase()}`;

	return (
		<div
			style={{
				alignItems: 'center',
				backgroundColor: color,
				borderRadius: '50%',
				color: 'white',
				display: 'flex',
				fontSize,
				fontWeight: 600,
				height,
				justifyContent: 'center',
				userSelect: 'none',
				width
			}}
		>
			{initials}
		</div>
	);
};
