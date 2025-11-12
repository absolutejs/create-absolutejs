import type { Pool, QueryResultRow } from 'pg'

type TemplateExecutor = <T extends QueryResultRow = QueryResultRow>(
  parts: TemplateStringsArray,
  ...params: unknown[]
) => Promise<T[]>

type QueryExecutor = <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
) => Promise<T[]>

type PgSqlShape = TemplateExecutor & {
  query: QueryExecutor
  end: () => Promise<void>
}

const buildQuery = (
  parts: TemplateStringsArray,
  params: unknown[]
) => {
  let text = ''
  const values: unknown[] = []

  for (let index = 0; index < parts.length; index += 1) {
    text += parts[index]

    if (index < params.length) {
      values.push(params[index])
      text += '$' + values.length
    }
  }

  return { text, values }
}

const normaliseValue = (value: unknown): unknown => {
  if (value === undefined) {
    return null
  }

  if (value === null) {
    return null
  }

  if (value instanceof Date || value instanceof Uint8Array || value instanceof ArrayBuffer) {
    return value
  }

  if (Array.isArray(value)) {
    return value.map(normaliseValue)
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }

  return value
}

const prepareParameters = (params: unknown[]): unknown[] =>
  params.map(normaliseValue)

export type PgSql = PgSqlShape

export const createPgSql = (pool: Pool): PgSql => {
  const executeTemplate: TemplateExecutor = async <T extends QueryResultRow>(
    parts: TemplateStringsArray,
    ...params: unknown[]
  ) => {
    const { text, values } = buildQuery(parts, params)
    const result = await pool.query<T>(text, prepareParameters(values))

    return result.rows
  }

  const sql = (executeTemplate as PgSql)

  sql.query = async <T extends QueryResultRow>(text: string, params: unknown[] = []) => {
    const result = await pool.query<T>(text, prepareParameters(params))

    return result.rows
  }

  sql.end = () => pool.end()

  return sql
}
