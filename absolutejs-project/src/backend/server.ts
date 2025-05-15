import { Elysia } from 'elysia';

const app = new Elysia();

// basic health-check endpoint
app.get('/', () => 'Hello, world!');

app.listen(3000, () => {
  console.log('🚀 Server running at http://localhost:3000');
});
