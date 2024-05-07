import type {D1Database} from "@cloudflare/workers-types";
import {PrismaKit, usePrisma} from "@/lib";
import {ChatHistoryScrollRo, ChatUserScrollRo, IMail, MailScrollRo, ReplyMailRo, SendMailRo} from "@/types/http";
import sql from "sql-template-tag";
import Email from "@/lib/vercel-email";
import {UserSession} from "@hocgin/nextjs-kit/dist/esm/type";
import {UserService} from "@/service/db/user-service";
import {UnAccessError} from "@/types/base";
import {ConvertKit} from "@/lib/convert";
import {getEmailDomain, getEmailName} from "@/lib/utils";
import {sendMail} from "@/lib/nodekit";

export class MailService {

  static async countByUnread(client: D1Database, session: UserSession) {
    let authorize = await UserService.useAuthorize(client, session);
    let {kit, prisma} = usePrisma(client);
    let inboxUnreadCount: number;
    if (authorize.readAccessAll) {
      inboxUnreadCount = await prisma.mail.count({where: {is_read: false, is_trash: false}});
    } else {
      inboxUnreadCount = await prisma.mail.count({
        where: {
          is_read: false,
          is_trash: false,
          owner: {in: authorize.readMails}
        }
      });
    }
    return {inboxUnreadCount};
  }

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
    return (await kit.scrollRaw(rawSql, ro)).convert(ConvertKit.asMail);
  }

  /**
   * 查询与某用户的沟通记录
   * @param client
   * @param ro
   * @param session
   */
  static async scrollByChatHistory(client: D1Database, ro: ChatHistoryScrollRo, session: UserSession) {
    let authorize = await UserService.useAuthorize(client, session);
    if (!authorize.readAccess(ro?.owner)) throw new UnAccessError();
    let {kit} = usePrisma(client);
    let keyword = PrismaKit.Raw.like(ro.keyword);
    let fromAddress = PrismaKit.Raw.like(`%"${ro.fromAddress}"%`);
    let rawSql = PrismaKit.Raw.sql(
      'SELECT M.* FROM Mail M',
      PrismaKit.Raw.where([
        PrismaKit.Raw.if(sql`AND (M.subject LIKE ${keyword} OR M.text LIKE ${keyword})`, keyword),
        PrismaKit.Raw.if(sql`AND (M.owner = ${ro.owner})`, ro.owner !== '*'),
        PrismaKit.Raw.if(sql`AND M.from_address like ${fromAddress}`, ro.fromAddress),
        PrismaKit.Raw.if(sql`AND (M.is_receive = ${ro?.isReceive})`, ro?.isReceive !== undefined),
      ]),
      PrismaKit.Raw.orderBy(['M.id DESC'])
    );
    return (await kit.scrollRaw(rawSql, ro)).convert(ConvertKit.asMail);
  }


  /**
   * 查询所有邮件，指定所属人
   */
  static async scrollBy(client: D1Database, ro: MailScrollRo, session: UserSession) {
    let authorize = await UserService.useAuthorize(client, session);
    if (!authorize.readAccess(ro?.owner)) throw new UnAccessError();

    let {kit} = usePrisma(client);
    let keyword = PrismaKit.Raw.like(ro.keyword);
    let rawSql = PrismaKit.Raw.sql(
      'SELECT M.* FROM Mail M',
      PrismaKit.Raw.where([
        PrismaKit.Raw.if(sql`AND (M.subject LIKE ${keyword} OR M.text LIKE ${keyword})`, keyword),
        PrismaKit.Raw.if(sql`AND (M.is_read = false)`, ro?.onlyUnread),
        PrismaKit.Raw.if(sql`AND (M.is_trash = ${ro?.isTrash})`, ro?.isTrash !== undefined),
        PrismaKit.Raw.if(sql`AND (M.is_archive = ${ro?.isArchive})`, ro?.isArchive !== undefined),
        PrismaKit.Raw.if(sql`AND (M.is_receive = ${ro?.isReceive})`, ro?.isReceive !== undefined),
        PrismaKit.Raw.if(sql`AND (M.owner = ${ro.owner})`, ro.owner !== '*'),
      ]),
      PrismaKit.Raw.orderBy(['M.id DESC'])
    );
    return (await kit.scrollRaw(rawSql, ro)).convert(ConvertKit.asMail);
  }

  /**
   * 发送邮件
   * @param client
   * @param ro
   * @param session
   * @param env
   */
  static async sendMail(client: D1Database, ro: SendMailRo, session: UserSession, env: CloudflareEnv) {
    let {sentAccess} = await UserService.useAuthorize(client, session);

    // 是否有权限发送
    let access = sentAccess(ro?.from?.address);
    if (!access) throw new UnAccessError();

    let {kit, prisma} = usePrisma(client);

    let domain = getEmailDomain(ro?.from?.address);
    let messageId = ['<yourself_', `${Date.now()}`, `@${domain}>`].join();

    ro = await sendMail(ro, env);

    await prisma.mail.create({
      data: {
        message_id: messageId,
        headers: '[]',
        to_address: JSON.stringify(ro?.to), from_address: JSON.stringify(ro?.from),
        cc: JSON.stringify(ro?.cc), bcc: JSON.stringify(ro?.bcc),
        subject: ro?.subject, html: ro?.html,
        owner: ro?.from?.address,
        date: new Date(),
        is_read: true,
        is_receive: false
      },
    });
  }

  static async replyMail(client: D1Database, id: string, ro: ReplyMailRo, session: UserSession, env: CloudflareEnv) {
    let {sentAccess} = await UserService.useAuthorize(client, session);
    let {kit, prisma} = usePrisma(client);

    let mail = ConvertKit.asMail(await prisma.mail.findUnique({where: {id: Number(id)}}));

    // 是否有权限发送
    let access = sentAccess(mail?.owner);
    if (!access) throw new UnAccessError();

    let domain = getEmailDomain(mail?.owner);
    let messageId = ['<yourself_', `${Date.now()}`, `@${domain}>`].join();
    let inReplyTo = mail?.messageId;

    let newRo = await sendMail({
      from: {address: mail?.owner},
      to: [mail.fromAddress],
      subject: ro.subject,
      html: ro.html
    }, env);

    await prisma.mail.create({
      data: {
        message_id: messageId,
        headers: '[]',
        to_address: JSON.stringify(newRo?.to), from_address: JSON.stringify(newRo?.from),
        cc: JSON.stringify(newRo?.cc), bcc: JSON.stringify(newRo?.bcc),
        subject: newRo?.subject, html: newRo?.html,
        owner: newRo?.from?.address,
        date: new Date(),
        is_read: true,
        in_reply_to: inReplyTo,
        is_receive: false
      },
    });
  }

  /**
   * 查询邮件详情
   * @param client
   * @param id
   * @param session
   */
  static async fetchById(client: D1Database, id: any, session: UserSession) {
    let authorize = await UserService.useAuthorize(client, session);
    let {kit, prisma} = usePrisma(client);
    let mail = ConvertKit.asMail(await prisma.mail.findUnique({where: {id: Number(id)}}));
    console.log('mail?.owner', mail?.owner);
    if (!authorize.readAccess(mail?.owner)) throw new UnAccessError();
    if (mail && !mail?.isRead) {
      await this.setReadyById(client, id, true, session);
    }
    return mail;
  }

  /**
   * 标记归档状态
   * @param client
   * @param id
   * @param isArchive
   * @param session
   */
  static async setArchiveById(client: D1Database, id: any, isArchive: boolean, session: UserSession) {
    let authorize = await UserService.useAuthorize(client, session);
    let {kit, prisma} = usePrisma(client);
    let mail = ConvertKit.asMail((await prisma.mail.findUnique({where: {id: Number(id)}})));
    if (!authorize.readAccess(mail?.owner)) throw new UnAccessError();
    if (!mail) return;
    await prisma.mail.update({
      where: {id: Number(id)},
      data: {is_archive: isArchive}
    });
  }

  /**
   * 标记回收站状态
   * @param client
   * @param id
   * @param isTrash
   * @param session
   */
  static async setTrashById(client: D1Database, id: any, isTrash: boolean, session: UserSession) {
    let authorize = await UserService.useAuthorize(client, session);
    let {kit, prisma} = usePrisma(client);
    let mail = ConvertKit.asMail((await prisma.mail.findUnique({where: {id: Number(id)}})));
    if (!authorize.readAccess(mail?.owner)) throw new UnAccessError();
    if (!mail) return;
    await prisma.mail.update({
      where: {id: Number(id)},
      data: {is_trash: isTrash}
    });
  }

  /**
   * 标记为已读状态
   * @param client
   * @param id
   * @param isReady
   * @param session
   */
  static async setReadyById(client: D1Database, id: any, isReady: boolean, session: UserSession) {
    let authorize = await UserService.useAuthorize(client, session);
    let {kit, prisma} = usePrisma(client);
    let mail = ConvertKit.asMail((await prisma.mail.findUnique({where: {id: Number(id)}})));
    if (!authorize.readAccess(mail?.owner)) throw new UnAccessError();
    if (!mail) return;
    await prisma.mail.update({
      where: {id: Number(id)},
      data: {is_read: isReady}
    });
  }

}
