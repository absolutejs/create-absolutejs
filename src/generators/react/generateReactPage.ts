export const generateReactPage = (
	isSingle: boolean
) => `import { useState } from 'react';
import { Head } from '../components/utils/Head';
import {
  bodyDefault,
  htmlDefault,
  mainDefault
} from '${isSingle ? '../styles' : '../../styles/react'}/defaultStyles';

export const ReactExample = () => {
  const [count, setCount] = useState(0);

  return (
    <html lang="en" style={htmlDefault}>
      <Head />
      <body style={bodyDefault}>
        <main style={mainDefault}>
          <style>{\`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to   { transform: rotate(360deg); }
            }
          \`}</style>
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '1rem',
              gap: '1.5rem'
            }}
          >
            <a
              href="https://react.dev"
              target="_blank"
              rel="noreferrer"
              style={{
                textDecoration: 'none'
              }}
            >
              <img
                src="/assets/svg/react.svg"
                alt="React logo"
                style={{
                  animation: 'spin 20s linear infinite',
                  transformOrigin: 'center center',
                  height: 145,
                  display: 'block'
                }}
              />
            </a>
            <h1
              style={{
                fontSize: '2rem',
                fontWeight: 600,
                color: '#333',
                margin: 0
              }}
            >
              AbsoluteJS + React
            </h1>
            <button
              onClick={() => setCount(prev => prev + 1)}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                fontWeight: 500,
                backgroundColor: '#0070f3',
                color: '#fff',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              count is {count}
            </button>
            <p style={{ fontSize: '1rem', color: '#555', margin: 0 }}>
              Edit{' '}
              <code
                style={{
                  backgroundColor: '#f5f5f5',
                  padding: '0.2rem 0.4rem',
                  borderRadius: '3px',
                  fontFamily: 'monospace'
                }}
              >
                src/frontend/${isSingle ? '' : 'react'}/pages/ReactExample.tsx
              </code>{' '}
              to edit this page
            </p>
          </div>
        </main>
      </body>
    </html>
  );
};
`;
