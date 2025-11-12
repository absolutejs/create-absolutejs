import { ReactExample } from '../frontend/pages/ReactExample'
import { createPgSql } from './database/createPgSql'
import { createCountHistory, getCountHistory } from './handlers/countHistoryHandlers'
import { asset, build, getEnv, handleReactPageRequest, networking } from '@absolutejs/absolute'
import { staticPlugin } from '@elysiajs/static'
import { Elysia, t } from 'elysia'
import { Pool } from 'pg'

const manifest = await build({
  assetsDirectory: 'src/backend/assets',
  buildDirectory: 'build',
  reactDirectory: 'src/frontend'
});

const connectionString = getEnv("DATABASE_URL")
if (process.env.ABSOLUTE_TEST_VERBOSE === '1') {
  console.log('Server runtime env: DATABASE_URL=' + connectionString)
  console.log('Server runtime env: PGHOST=' + (process.env.PGHOST ?? 'undefined'))
  console.log('Server runtime env: PGPORT=' + (process.env.PGPORT ?? 'undefined'))
}
const pool = new Pool({ connectionString })
const db = createPgSql(pool)

new Elysia()
.use(networking)
.use(staticPlugin({"assets":"./build","prefix":""}))
  .get('/', () => handleReactPageRequest(
        ReactExample,
        asset(manifest, 'ReactExampleIndex'),
        { initialCount: 0, cssPath: asset(manifest, 'ReactExampleCSS') }
      ))
  .get('/react', () => handleReactPageRequest(
        ReactExample,
        asset(manifest, 'ReactExampleIndex'),
        { initialCount: 0, cssPath: asset(manifest, 'ReactExampleCSS') }
      ))
  .get('/count/:uid', ({ params: { uid } }) => getCountHistory(db, uid), {
    params: t.Object({
      uid: t.Number()
    })
  })
  .post('/count', ({ body: { count } }) => createCountHistory(db, count), {
    body: t.Object({
      count: t.Number()
    })
  })
  .on('error', err => {
    const { request } = err
    console.error(`Server error on ${request.method} ${request.url}: ${err.message}`)
  });
