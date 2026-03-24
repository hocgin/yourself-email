import { sql, SQL } from 'drizzle-orm'

export class QueryBuilder {
  static buildSql(template: TemplateStringsArray, ...args: any[]) {
    return sql.raw(template.reduce((result, part, i) => {
      return result + part + (args[i] ?? '')
    }, ''))
  }

  static buildWhere(conditions: (SQL | undefined)[]) {
    const validConditions = conditions.filter((c): c is SQL => c !== undefined)
    if (validConditions.length === 0) {
      return sql``
    }
    return sql` WHERE ${sql.join(validConditions, sql` AND `)}`
  }

  static if(condition: any, sqlChunk: SQL): SQL | undefined {
    return condition ? sqlChunk : undefined
  }

  static ifIn(column: string, values: string[], condition = true): string | undefined {
    if (!condition || !values || values.length === 0) {
      return undefined
    }
    const placeholders = values.map(() => '?').join(', ')
    return `${column} IN (${placeholders})`
  }

  static like(value: string | undefined) {
    return value ? `%${value}%` : undefined
  }

  static orderBy(clauses: string[]) {
    if (clauses.length === 0) {
      return sql``
    }
    return sql` ORDER BY ${sql.raw(clauses.join(', '))}`
  }
}
