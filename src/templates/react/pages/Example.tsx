import { useState } from 'react';
import { Head } from '../components/utils/Head';
import {
	bodyDefault,
	htmlDefault,
	mainDefault
} from '../styles/default/pageDefault';

export const Example = () => {
	const [count, setCount] = useState(0);

	return (
		<html lang="en" style={htmlDefault}>
			<Head />
			<style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
			<body style={bodyDefault}>
				<main style={mainDefault}>
					<a
						href="https://absolutejs.dev"
						target="_blank"
						rel="noreferrer"
					>
						<img
							src="/assets/svg/react-logo.svg"
							alt="React logo"
							style={{
								animation: 'spin 20s linear infinite',
								height: 145
							}}
						/>
					</a>
					<h1>AbsoluteJS + React</h1>
					<div>
						<button
							onClick={() =>
								setCount((prevCount) => prevCount + 1)
							}
						>
							count is {count}
						</button>
					</div>
					<p>
						Edit <code>src/pages/Example.tsx</code> and save to test
						HMR
					</p>
				</main>
			</body>
		</html>
	);
};
