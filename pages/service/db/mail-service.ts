import type {D1Database} from "@cloudflare/workers-types";
import {usePrisma, PrismaKit} from "@/lib";
import {ChatUserScrollRo, ChatHistoryScrollRo, SendMailRo, IMail, MailScrollRo} from "@/types/http";
import sql from "sql-template-tag";
import Email from "vercel-email";
import {UserSession} from "@hocgin/nextjs-kit/dist/esm/type";
import {UserService} from "@/service/db/user-service";
import {UnAccessError} from "@/types/base";
import {ConvertKit} from "@/lib/convert";

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
   */
  static async sendMail(client: D1Database, ro: SendMailRo, session: UserSession) {
    let {sentAccess} = await UserService.useAuthorize(client, session);

    // 是否有权限发送
    let access = sentAccess(ro?.from?.address);
    if (!access) throw new UnAccessError();


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
    let html = ro.html;
    if (html) {
      html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><meta http-equiv="Content-Type" content="text/html charset=UTF-8" /><html lang="en"><body>${html}</body></html>`
    }
    await Email.send({
      to: asMails(to),
      cc: asMails(cc),
      bcc: asMails(bcc),
      from: asMail(from),
      subject: ro.subject,
      html: html,
    });
    await prisma.mail.create({
      data: {
        headers: '[]',
        from_address: JSON.stringify(from),
        to_address: JSON.stringify(to),
        html: html,
        owner: from?.address,
        message_id: `message_id_${Date.now()}`,
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
