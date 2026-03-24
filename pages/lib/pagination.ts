// @ts-ignore - 无法找到模块声明
import type { Scroll, Paging } from '@hocgin/nextjs-kit'
import type { DBClient } from './db'

export class PaginationResult<T> {
  constructor(
    private rawList: T[],
    private meta?: {
      total?: number
      current?: number
      size?: number
      nextId?: string | number
      hasMore?: boolean
    }
  ) {}

  convert<R>(converter: (item: T) => R): Scroll<R> & Paging<R> {
    const convertedList = this.rawList.map(converter).filter((item): item is NonNullable<R> => item != null)

    const result: any = {}

    // Scroll 格式
    if (this.meta?.hasMore !== undefined || this.meta?.nextId !== undefined) {
      result.records = convertedList
      result.hasMore = this.meta.hasMore ?? false
      result.nextId = this.meta.nextId
    }
    // Paging 格式
    else if (this.meta?.total !== undefined) {
      result.records = convertedList
      result.total = this.meta.total
      result.size = this.meta.size ?? convertedList.length
      result.current = this.meta.current ?? 1
    }
    // 默认 Scroll 格式
    else {
      result.records = convertedList
      result.hasMore = false
      result.nextId = undefined
    }

    return result
  }
}

export async function scroll<T>(
  client: DBClient,
  rawSql: string,
  ro: any
): Promise<PaginationResult<T>> {
  const { d1 } = client
  const { nextId, size = 20 } = ro

  let finalSql = rawSql

  // 添加 nextId 条件 (cursor-based pagination)
  if (nextId) {
    // 在 ORDER BY 之前插入条件
    const orderByIndex = finalSql.toUpperCase().indexOf(' ORDER BY ')
    if (orderByIndex !== -1) {
      const beforeOrderBy = finalSql.substring(0, orderByIndex)
      const afterOrderBy = finalSql.substring(orderByIndex)

      // 检查 beforeOrderBy 部分是否已有 WHERE 子句
      if (beforeOrderBy.toUpperCase().includes(' WHERE ')) {
        finalSql = `${beforeOrderBy} AND id > ${nextId}${afterOrderBy}`
      } else {
        finalSql = `${beforeOrderBy} WHERE id > ${nextId}${afterOrderBy}`
      }
    } else {
      // 没有 ORDER BY,直接添加
      if (finalSql.toUpperCase().includes(' WHERE ')) {
        finalSql = `${finalSql} AND id > ${nextId}`
      } else {
        finalSql = `${finalSql} WHERE id > ${nextId}`
      }
    }
  }

  // 添加 limit (多取一条用于判断是否有更多数据)
  finalSql = `${finalSql} LIMIT ${size + 1}`

  try {
    const result = await d1.prepare(finalSql).all()

    let list = (result.results || []) as T[]
    let hasNextPage = false
    let lastId: string | number | undefined

    // 如果返回的记录数超过 size,说明还有下一页
    if (list.length > size) {
      list = list.slice(0, size) as T[]
      hasNextPage = true
      if (list.length > 0) {
        const lastItem = list[list.length - 1] as any
        lastId = lastItem.id
      }
    }

    return new PaginationResult<T>(list, {
      hasMore: hasNextPage,
      nextId: lastId,
      size: size,
    })
  } catch (error) {
    console.error('Scroll query error:', error)
    console.error('SQL:', finalSql)
    throw error
  }
}

export async function paging<T>(
  client: DBClient,
  rawSql: string,
  ro: any
): Promise<PaginationResult<T>> {
  const { d1 } = client
  const { page = 1, size = 20 } = ro

  try {
    // 计算总数
    const countSql = `SELECT COUNT(*) as total FROM (${rawSql}) as count_table`
    const countResult = await d1.prepare(countSql).first()
    const total = (countResult?.total as number) || 0

    // 计算分页
    const offset = (page - 1) * size
    const finalSql = `${rawSql} LIMIT ${size} OFFSET ${offset}`

    const result = await d1.prepare(finalSql).all()
    const list = (result.results || []) as T[]

    return new PaginationResult<T>(list, {
      total: total,
      current: page,
      size: size,
    })
  } catch (error) {
    console.error('Paging query error:', error)
    console.error('SQL:', rawSql)
    throw error
  }
}
