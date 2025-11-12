
import type { PgSql } from '../database/createPgSql'

export const getCountHistory = async (db: PgSql, uid: number) => {
  const [history] = await db`
    SELECT * FROM count_history
    WHERE uid = ${uid}
    LIMIT 1
  `
  return history ?? null
}

export const createCountHistory = async (db: PgSql, count: number) => {
  const [newHistory] = await db`
    INSERT INTO count_history (count)
    VALUES (${count})
    RETURNING *
  `
  return newHistory
}
