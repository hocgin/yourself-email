import type { D1Database } from '@cloudflare/workers-types'
import type { UserConfigPagingRo, UserConfigSaveRo } from '@/types/http'
import { useDb, join, unique, removeArray, QueryBuilder, paging, userConfig } from '@/lib'
import type { UserSession } from '@hocgin/nextjs-kit/dist/esm/type'
import { MailService } from '@/service/db/mail-service'
import { UnAccessError } from '@/types/base'
import { ConvertKit } from '@/lib/convert'
import { eq } from 'drizzle-orm'

export class UserService {
  static async save(client: D1Database, id: string | number | undefined, ro: UserConfigSaveRo, session: UserSession) {
    let authorize = await this.useAuthorize(client, session)
    if (!authorize.isSuperAdmin) throw new UnAccessError()
    let { db } = useDb(client)

    if (id) {
      await db
        .update(userConfig)
        .set({
          readMail: join(unique(ro?.readMail)),
          sentMail: join(unique(ro?.sentMail)),
        })
        .where(eq(userConfig.id, Number(id)))
    } else {
      await db.insert(userConfig).values({
        email: ro.email,
        readMail: join(unique(ro?.readMail)),
        sentMail: join(unique(ro?.sentMail)),
        createdAt: Date.now(),
      })
    }
  }

  static async deleteById(client: D1Database, id: string | number, session: UserSession) {
    let authorize = await this.useAuthorize(client, session)
    if (!authorize.isSuperAdmin) throw new UnAccessError()
    let { db } = useDb(client)
    await db.delete(userConfig).where(eq(userConfig.id, Number(id)))
  }

  static async pagingBy(client: D1Database, ro: UserConfigPagingRo, session: UserSession) {
    let authorize = await this.useAuthorize(client, session)
    if (!authorize.isSuperAdmin) throw new UnAccessError()
    let keyword = ro.keyword
    let dbClient = useDb(client)

    let conditions: string[] = []
    if (keyword) {
      conditions.push(`(UC.email LIKE '%${keyword}%')`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    let rawSql = `SELECT UC.* from UserConfig UC
      ${whereClause}
      ORDER BY UC.email`

    return (await paging(dbClient, rawSql, ro)).convert(ConvertKit.asUserConfig)
  }

  static async getState(client: D1Database, session: UserSession) {
    let authorize = await this.useAuthorize(client, session)
    let result = await this.listAccountsByUser(client, session)
    let oldAddress = (result ?? []).map(({ address }: any) => address)
    let newAddress = removeArray(authorize?.readMails ?? [], oldAddress).map((address) => ({ address }))
    return {
      isSuperAdmin: authorize.isSuperAdmin,
      sentMails: authorize.sentMails,
      readMails: authorize.readMails,
      accounts: unique([...result, ...newAddress]),
      ...(await MailService.countByUnread(client, session)),
    }
  }

  static async useAuthorize(client: D1Database, session: UserSession) {
    let { db } = useDb(client)
    let email = session.email

    // 查找用户配置
    let configResult = await db.select().from(userConfig).where(eq(userConfig.email, email)).limit(1)
    let config = configResult[0]

    // 查找默认权限
    if (!config) {
      let defaultConfigResult = await db.select().from(userConfig).where(eq(userConfig.email, '*')).limit(1)
      config = defaultConfigResult[0]
    }

    let sentMail = config?.sentMail
    let sentMails = !sentMail ? [] : sentMail?.split(',')
    let readMail = config?.readMail
    let readMails = !readMail ? [] : readMail?.split(',')

    return {
      email,
      isSuperAdmin: config?.isSuperAdmin || false,
      sentMails,
      sentAccessAll: sentMails.includes('*'),
      sentAccess: (email: string) => sentMails.includes('*') || sentMails.includes(email),
      readMails,
      readAccessAll: readMails.includes('*'),
      readAccess: (email: string) => readMails.includes('*') || readMails.includes(email),
    } as const
  }

  static async listAccountsByUser(client: D1Database, session: UserSession) {
    let { d1 } = useDb(client)
    let { readAccessAll, readMails } = await this.useAuthorize(client, session)

    let conditions: string[] = []
    if (!readAccessAll) {
      const mailList = readMails.map((m) => `'${m}'`).join(',')
      conditions.push(`(M.owner IN (${mailList}))`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    let rawSql = `SELECT DISTINCT M.owner address from Mail M
      ${whereClause}
      ORDER BY M.owner`

    const result = await d1.prepare(rawSql).all()
    let accounts = result?.results || []

    if (readAccessAll) {
      return [{ name: 'all', address: '*' }, ...accounts]
    }
    return accounts
  }
}
