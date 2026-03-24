import { drizzle } from 'drizzle-orm/d1'
import * as schema from './schema'

export type DBCliType = ReturnType<typeof drizzle<typeof schema>>

export interface DBClient {
  db: DBCliType
  d1: D1Database
}

export function useDb(d1: D1Database): DBClient {
  return {
    db: drizzle(d1, { schema }),
    d1: d1,
  }
}
