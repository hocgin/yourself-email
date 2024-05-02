import type {D1Database} from "@cloudflare/workers-types";
import {usePrisma, PrismaKit} from "@/lib";
import {ChatUserScrollRo, ChatHistoryScrollRo, SendMailRo, IMail, MailScrollRo} from "@/types/http";
import sql, {raw} from "sql-template-tag";
import type {Mail} from "@prisma/client";
import Email from "vercel-email";

export class MailService {

  /**
   * 查询用户列表(根据最新沟通记录排序)
   * @param client
   * @param ro
   */
  static async scrollByChatUser(client: D1Database, ro: ChatUserScrollRo) {
    let {kit} = usePrisma(client);
    let keyword = ro.keyword;
    let rawSql = PrismaKit.Raw.sql(
      sql`WITH LatestMail AS (SELECT M.*,
                                   MAX(M.date) AS latest_reply_time
                            FROM Mail M
                            WHERE M.owner = ${ro.owner}
                            GROUP BY M.from_address),
             UnreadCounts AS (SELECT M.*,
                                     COUNT(*) FILTER (WHERE M.is_read = 0) AS unread_count
                              FROM Mail M
                              WHERE M.owner = ${ro.owner}
                              GROUP BY M.from_address)
        SELECT LM.*,
               UC.unread_count
        FROM LatestMail LM
               JOIN UnreadCounts UC ON LM.from_address = UC.from_address`,
      PrismaKit.Raw.where([
        PrismaKit.Raw.if(sql`AND (LM.subject LIKE ${keyword} OR LM.text LIKE ${keyword})`, keyword),
        PrismaKit.Raw.if(sql`AND (LM.is_read = false)`, ro?.onlyUnread),
      ]),
      PrismaKit.Raw.orderBy(['LM.date DESC']));
    return (await kit.scrollRaw(rawSql, ro)).convert(this.asMail);
  }

  /**
   * 查询与某用户的沟通记录
   * @param client
   * @param ro
   */
  static async scrollByChatHistory(client: D1Database, ro: ChatHistoryScrollRo) {
    let {kit} = usePrisma(client);
    let keyword = ro.keyword;
    let rawSql = PrismaKit.Raw.sql(
      'SELECT M.* FROM Mail M',
      PrismaKit.Raw.where([
        PrismaKit.Raw.if(sql`AND (M.subject LIKE ${keyword} OR M.text LIKE ${keyword})`, keyword),
      ]),
      PrismaKit.Raw.orderBy(['M.id'])
    );
    return (await kit.scrollRaw(rawSql, ro)).convert(this.asMail);
  }


  /**
   * 查询所有邮件，指定所属人
   */
  static async scrollBy(client: D1Database, ro: MailScrollRo) {
    let {kit} = usePrisma(client);
    let keyword = PrismaKit.Raw.like(ro.keyword);
    console.log('keyword', keyword);
    let rawSql = PrismaKit.Raw.sql(
      'SELECT M.* FROM Mail M',
      PrismaKit.Raw.where([
        PrismaKit.Raw.if(sql`AND (M.subject LIKE ${keyword} OR M.text LIKE ${keyword})`, keyword),
        PrismaKit.Raw.if(sql`AND (M.is_read = false)`, ro?.onlyUnread),
        sql`AND (M.owner = ${ro.owner})`,
      ]),
      PrismaKit.Raw.orderBy(['M.id'])
    );
    return (await kit.scrollRaw(rawSql, ro)).convert(this.asMail);
  }

  /**
   * 发送邮件
   * @param client
   * @param ro
   */
  static async sendMail(client: D1Database, ro: SendMailRo) {
    let {kit, prisma} = usePrisma(client);
    let asMail = (mail) => ({
      email: mail?.address,
      name: mail?.name,
    });
    let asMails = (mails: IMail[]) => {
      if (!mails?.length) return undefined;
      return mails.map(asMail);
    };
    let to = ro?.to ?? [];
    let cc = ro?.cc ?? [];
    let bcc = ro?.bcc ?? [];
    let from = ro?.from;

    await Email.send({
      to: asMails(to),
      cc: asMails(cc),
      bcc: asMails(bcc),
      from: asMail(from),
      subject: ro.subject,
      html: ro?.html,
    });
    await prisma.mail.create({
      data: {
        headers: '[]',
        from_address: JSON.stringify(from),
        to_address: JSON.stringify(to),
        html: ro.html,
        owner: from?.address,
        message_id: `message_id_${Date.now()}`,
      },
    });
  }

  /**
   * 查询邮件详情
   * @param client
   * @param id
   */
  static async fetchById(client: D1Database, id: any) {
    if (!id) return;
    let {kit, prisma} = usePrisma(client);
    let mail = await prisma.mail.findFirst({
      where: {id: Number(id)},
    });
    if (mail && !mail?.is_read) {
      await this.readyById(client, id)
    }
    return this.asMail(mail);
  }

  /**
   * 标记为已读
   * @param client
   * @param id
   */
  static async readyById(client: D1Database, id: any) {
    let {kit, prisma} = usePrisma(client);
    await prisma.mail.update({
      where: {id: Number(id)},
      data: {is_read: true}
    });
  }

  static asMail(entity: (Mail | any)) {
    return {
      id: entity.id,
      headers: JSON.parse(entity.headers),
      fromAddress: JSON.parse(entity.from_address),
      sender: JSON.parse(entity.sender),
      replyTo: JSON.parse(entity.reply_to),
      toAddress: JSON.parse(entity.to_address),
      cc: JSON.parse(entity.cc),
      bcc: JSON.parse(entity.bcc),
      returnPath: JSON.parse(entity.return_path),
      deliveredTo: entity.delivered_to,
      subject: entity.subject,
      messageId: entity.message_id,
      inReplyTo: entity.in_reply_to,
      reference: entity.reference,
      date: entity.date,
      html: entity.html,
      text: entity.text,
      attachments: entity.attachments,
      isRead: entity.is_read,
      isImportant: entity.is_important,
      createdAt: entity.created_at,
      lastUpdatedAt: entity.last_updated_at,
      unreadCount: entity?.unread_count,
    } as const;
  }
}
