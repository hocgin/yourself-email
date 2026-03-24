import type { D1Database } from '@cloudflare/workers-types'
import { formatDate, useDb, QueryBuilder, scroll, mail } from '@/lib'
import type { ChatHistoryScrollRo, ChatUserScrollRo, MailScrollRo, ReplyMailRo, SendMailRo } from '@/types/http'
import Email from '@/lib/vercel-email'
import type { UserSession } from '@hocgin/nextjs-kit/dist/esm/type'
import { UserService } from '@/service/db/user-service'
import { UnAccessError } from '@/types/base'
import { ConvertKit } from '@/lib/convert'
import { getEmailDomain, getEmailName } from '@/lib/utils'
import { sendMail } from '@/lib/nodekit'
import { eq, count } from 'drizzle-orm'

export class MailService {
  static async countByUnread(client: D1Database, session: UserSession) {
    let authorize = await UserService.useAuthorize(client, session)
    let { db, d1 } = useDb(client)
    let inboxUnreadCount: number

    if (authorize.readAccessAll) {
      const result = await db
        .select({ count: count() })
        .from(mail)
        .where(eq(mail.isRead, false))
      inboxUnreadCount = result[0]?.count || 0
    } else {
      const mailList = authorize.readMails.map(() => '?').join(',')
      const rawSql = `SELECT COUNT(*) as count FROM Mail WHERE is_read = 0 AND owner IN (${mailList})`
      const countResult = await d1.prepare(rawSql).bind(...authorize.readMails).first()
      inboxUnreadCount = (countResult?.count as number) || 0
    }
    return { inboxUnreadCount }
  }

  /**
   * 查询用户列表(根据最新沟通记录排序)
   * @param client
   * @param ro
   */
  static async scrollByChatUser(client: D1Database, ro: ChatUserScrollRo) {
    let dbClient = useDb(client)
    let keyword = ro.keyword

    // 使用原始 SQL 处理复杂的 CTE 查询
    let conditions: string[] = []
    if (keyword) {
      conditions.push(`(LM.subject LIKE '%${keyword}%' OR LM.text LIKE '%${keyword}%')`)
    }
    if (ro?.onlyUnread) {
      conditions.push('(LM.is_read = 0)')
    }
    const whereClause = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : ''

    let rawSql = `WITH LatestMail AS (
      SELECT M.*, MAX(M.date) AS latest_reply_time
      FROM Mail M
      WHERE M.owner = '${ro.owner}'
      GROUP BY M.from_address
    ),
    UnreadCounts AS (
      SELECT M.*, COUNT(*) FILTER (WHERE M.is_read = 0) AS unread_count
      FROM Mail M
      WHERE M.owner = '${ro.owner}'
      GROUP BY M.from_address
    )
    SELECT LM.*, UC.unread_count
    FROM LatestMail LM
    JOIN UnreadCounts UC ON LM.from_address = UC.from_address
    ${whereClause}
    ORDER BY LM.date DESC`

    return (await scroll(dbClient, rawSql, ro)).convert(ConvertKit.asMail)
  }

  /**
   * 查询与某用户的沟通记录
   * @param client
   * @param ro
   * @param session
   */
  static async scrollByChatHistory(client: D1Database, ro: ChatHistoryScrollRo, session: UserSession) {
    let authorize = await UserService.useAuthorize(client, session)
    if (!authorize.readAccess(ro?.owner)) throw new UnAccessError()
    let dbClient = useDb(client)

    let keyword = ro.keyword
    let conditions: string[] = []
    if (keyword) {
      conditions.push(`(M.subject LIKE '%${keyword}%' OR M.text LIKE '%${keyword}%')`)
    }
    if (ro.owner !== '*') {
      conditions.push(`(M.owner = '${ro.owner}')`)
    }
    if (ro.fromAddress) {
      conditions.push(`(M.from_address LIKE '%"${ro.fromAddress}"%')`)
    }
    if (ro?.isReceive !== undefined) {
      conditions.push(`(M.is_receive = ${ro?.isReceive ? 1 : 0})`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    let rawSql = `SELECT M.* FROM Mail M
      ${whereClause}
      ORDER BY M.id DESC`

    return (await scroll(dbClient, rawSql, ro)).convert(ConvertKit.asMail)
  }

  /**
   * 查询所有邮件，指定所属人
   */
  static async scrollBy(client: D1Database, ro: MailScrollRo, session: UserSession) {
    let authorize = await UserService.useAuthorize(client, session)
    if (!authorize.readAccess(ro?.owner)) throw new UnAccessError()

    let dbClient = useDb(client)
    let keyword = ro.keyword

    let conditions: string[] = []
    if (keyword) {
      conditions.push(`(M.subject LIKE '%${keyword}%' OR M.text LIKE '%${keyword}%')`)
    }
    if (ro?.onlyUnread) {
      conditions.push(`(M.is_read = 0)`)
    }
    if (ro?.isTrash !== undefined) {
      conditions.push(`(M.is_trash = ${ro?.isTrash ? 1 : 0})`)
    }
    if (ro?.isArchive !== undefined) {
      conditions.push(`(M.is_archive = ${ro?.isArchive ? 1 : 0})`)
    }
    if (ro?.isReceive !== undefined) {
      conditions.push(`(M.is_receive = ${ro?.isReceive ? 1 : 0})`)
    }
    if (ro.owner !== '*') {
      conditions.push(`(M.owner = '${ro.owner}')`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    let rawSql = `SELECT M.* FROM Mail M
      ${whereClause}
      ORDER BY M.id DESC`

    return (await scroll(dbClient, rawSql, ro)).convert(ConvertKit.asMail)
  }

  /**
   * 发送邮件
   * @param client
   * @param ro
   * @param session
   * @param env
   */
  static async sendMail(client: D1Database, ro: SendMailRo, session: UserSession, env: CloudflareEnv) {
    let { sentAccess } = await UserService.useAuthorize(client, session)

    // 是否有权限发送
    let access = sentAccess(ro?.from?.address)
    if (!access) throw new UnAccessError()

    let { db } = useDb(client)

    let domain = getEmailDomain(ro?.from?.address)
    let messageId = ['<yourself_', `${Date.now()}`, `@${domain}>`].join('')

    ro = await sendMail(ro, env)

    await db.insert(mail).values({
      messageId: messageId,
      headers: '[]',
      toAddress: JSON.stringify(ro?.to),
      fromAddress: JSON.stringify(ro?.from),
      cc: JSON.stringify(ro?.cc),
      bcc: JSON.stringify(ro?.bcc),
      subject: ro?.subject,
      html: ro?.html,
      owner: ro?.from?.address,
      date: Date.now(),
      isRead: true,
      isReceive: false,
      createdAt: Date.now(),
    })
  }

  static async replyMail(client: D1Database, id: string, ro: ReplyMailRo, session: UserSession, env: CloudflareEnv) {
    let { sentAccess } = await UserService.useAuthorize(client, session)
    let { db } = useDb(client)

    let mailEntity = await db.select().from(mail).where(eq(mail.id, Number(id))).limit(1)
    let mailData = mailEntity[0]
    let mailItem = ConvertKit.asMail(mailData)

    // 是否有权限发送
    let access = sentAccess(mailItem?.owner)
    if (!access) throw new UnAccessError()

    let domain = getEmailDomain(mailItem?.owner)
    let messageId = ['<yourself_', `${Date.now()}`, `@${domain}>`].join('')
    let inReplyTo = mailItem?.messageId

    let html = ro.html

    // 如果旧内容长度短，添加旧内容信息
    let oldHtml = mailItem?.html
    if (oldHtml?.length < 4 * 1024) {
      let fromAddress = mailItem?.fromAddress
      let ownerName = getEmailName(mailItem?.owner)
      let newHtml = `<div><br/><div style="font-size:70%;padding:2px 0">------------------ Original ------------------</div>
        <div style="font-size:70%;background:#f0f0f0;color:#212121;padding:8px;border-radius:4px"><div>
        <b>Sender:</b> ${fromAddress?.name} &lt;${fromAddress?.address}&gt;</div><div>
        <b>SendTime:</b> ${formatDate(mailItem?.date)}</div><div>
        <b>Recipient:</b> ${ownerName} &lt;${mailItem?.owner}&gt;</div><div>
        <b>Subject:</b> ${mailItem?.subject}</div></div></div><br/>`
      html = oldHtml + newHtml + html
    }

    let newRo = await sendMail(
      {
        from: { address: mailItem?.owner },
        to: [mailItem.fromAddress],
        subject: ro.subject,
        html: html,
      },
      env
    )

    await db.insert(mail).values({
      messageId: messageId,
      headers: '[]',
      toAddress: JSON.stringify(newRo?.to),
      fromAddress: JSON.stringify(newRo?.from),
      cc: JSON.stringify(newRo?.cc),
      bcc: JSON.stringify(newRo?.bcc),
      subject: newRo?.subject,
      html: newRo?.html,
      owner: newRo?.from?.address,
      date: Date.now(),
      isRead: true,
      inReplyTo: inReplyTo,
      isReceive: false,
      createdAt: Date.now(),
    })
  }

  /**
   * 查询邮件详情
   * @param client
   * @param id
   * @param session
   */
  static async fetchById(client: D1Database, id: any, session: UserSession) {
    let authorize = await UserService.useAuthorize(client, session)
    let { db } = useDb(client)
    let mailEntity = await db.select().from(mail).where(eq(mail.id, Number(id))).limit(1)
    let mailItem = ConvertKit.asMail(mailEntity[0])

    console.log('mail?.owner', mailItem?.owner)
    if (!authorize.readAccess(mailItem?.owner)) throw new UnAccessError()
    if (mailItem && !mailItem?.isRead) {
      await this.setReadyById(client, id, true, session)
    }
    return mailItem
  }

  /**
   * 标记归档状态
   * @param client
   * @param id
   * @param isArchive
   * @param session
   */
  static async setArchiveById(client: D1Database, id: any, isArchive: boolean, session: UserSession) {
    let authorize = await UserService.useAuthorize(client, session)
    let { db } = useDb(client)
    let mailEntity = await db.select().from(mail).where(eq(mail.id, Number(id))).limit(1)
    let mailItem = ConvertKit.asMail(mailEntity[0])

    if (!authorize.readAccess(mailItem?.owner)) throw new UnAccessError()
    if (!mailItem) return
    await db.update(mail).set({ isArchive: isArchive }).where(eq(mail.id, Number(id)))
  }

  /**
   * 标记回收站状态
   * @param client
   * @param id
   * @param isTrash
   * @param session
   */
  static async setTrashById(client: D1Database, id: any, isTrash: boolean, session: UserSession) {
    let authorize = await UserService.useAuthorize(client, session)
    let { db } = useDb(client)
    let mailEntity = await db.select().from(mail).where(eq(mail.id, Number(id))).limit(1)
    let mailItem = ConvertKit.asMail(mailEntity[0])

    if (!authorize.readAccess(mailItem?.owner)) throw new UnAccessError()
    if (!mailItem) return
    await db.update(mail).set({ isTrash: isTrash }).where(eq(mail.id, Number(id)))
  }

  /**
   * 标记为已读状态
   * @param client
   * @param id
   * @param isReady
   * @param session
   */
  static async setReadyById(client: D1Database, id: any, isReady: boolean, session: UserSession) {
    let authorize = await UserService.useAuthorize(client, session)
    let { db } = useDb(client)
    let mailEntity = await db.select().from(mail).where(eq(mail.id, Number(id))).limit(1)
    let mailItem = ConvertKit.asMail(mailEntity[0])

    if (!authorize.readAccess(mailItem?.owner)) throw new UnAccessError()
    if (!mailItem) return
    await db.update(mail).set({ isRead: isReady }).where(eq(mail.id, Number(id)))
  }
}
