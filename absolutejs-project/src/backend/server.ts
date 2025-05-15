import { cors } from '@elysia-cors';
import { staticPlugin } from '@elysia-static';
import { swagger } from '@elysiajs/swagger';
import { Elysia } from 'elysia';
import { rateLimit } from 'elysia-rate-limit';

new Elysia()
  .get('/', () => 'Hello, world!')
  .use(staticPlugin())
  .use(cors())
  .use(swagger())
  .use(rateLimit())
  .listen(3000, () => {
    console.log('🚀 Server running at http://localhost:3000');
  });