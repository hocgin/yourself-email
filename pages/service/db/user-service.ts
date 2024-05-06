import type {D1Database} from "@cloudflare/workers-types";
import {UserConfigPagingRo, UserConfigSaveRo} from "@/types/http";
import {PrismaKit, usePrisma, join, removeArray, unique} from "@/lib";
import {UserSession} from "@hocgin/nextjs-kit/dist/esm/type";
import {MailService} from "@/service/db/mail-service";
import {UnAccessError} from "@/types/base";
import {ConvertKit} from "@/lib/convert";
import sql from "sql-template-tag";

export class UserService {
  static async save(client: D1Database, id: string | number | undefined, ro: UserConfigSaveRo, session: UserSession) {
    let authorize = await this.useAuthorize(client, session);
    if (!authorize.isSuperAdmin) throw new UnAccessError();
    let {kit, prisma} = usePrisma(client);

    if (id) {
      await prisma.userConfig.update({
        where: {id: Number(id)},
        data: {read_mail: join(unique(ro?.readMail)), sent_mail: join(unique(ro?.sentMail))}
      });
    } else {
      await prisma.userConfig.create({
        data: {
          email: ro.email,
          read_mail: join(unique(ro?.readMail)),
          sent_mail: join(unique(ro?.sentMail))
        }
      });
    }
  }

  static async deleteById(client: D1Database, id: string | number, session: UserSession) {
    let authorize = await this.useAuthorize(client, session);
    if (!authorize.isSuperAdmin) throw new UnAccessError();
    let {kit, prisma} = usePrisma(client);
    await prisma.userConfig.delete({where: {id: Number(id)}});
  }

  static async pagingBy(client: D1Database, ro: UserConfigPagingRo, session: UserSession) {
    let authorize = await this.useAuthorize(client, session);
    if (!authorize.isSuperAdmin) throw new UnAccessError();
    let keyword = PrismaKit.Raw.like(ro.keyword);
    let {kit, prisma} = usePrisma(client);
    let rawSql = PrismaKit.Raw.sql(
      'SELECT UC.* from UserConfig UC',
      PrismaKit.Raw.where([
        PrismaKit.Raw.if(sql`AND (UC.email LIKE ${keyword})`, keyword),
      ]),
      PrismaKit.Raw.orderBy(['UC.email'])
    );
    return (await kit.pagingRaw(rawSql, ro)).convert(ConvertKit.asUserConfig);
  }

  static async getState(client: D1Database, session: UserSession) {
    let authorize = await this.useAuthorize(client, session);
    let result = await this.listAccountsByUser(client, session);
    let oldAddress = (result ?? []).map(({address}) => address);
    let newAddress = removeArray((authorize?.readMails ?? []), oldAddress).map((address) => ({address}));
    return {
      isSuperAdmin: authorize.isSuperAdmin,
      sentMails: authorize.sentMails,
      readMails: authorize.readMails,
      accounts: unique([...result, ...newAddress]),
      ...(await MailService.countByUnread(client, session))
    };
  }

  static async useAuthorize(client: D1Database, session: UserSession) {
    let {kit, prisma} = usePrisma(client);
    let email = session.email;
    let config = await prisma.userConfig.findUnique({where: {email}});

    // 查找默认权限
    if (!config) {
      config = await prisma.userConfig.findUnique({where: {email: '*'}});
    }

    let sentMail = config?.sent_mail;
    let sentMails = !sentMail ? [] : sentMail?.split(',');
    let readMail = config?.read_mail;
    let readMails = !readMail ? [] : readMail?.split(',');

    return {
      email,
      isSuperAdmin: config?.is_super_admin,
      sentMails,
      sentAccessAll: sentMails.includes('*'),
      sentAccess: (email: string) => sentMails.includes('*') || sentMails.includes(email),
      readMails,
      readAccessAll: readMails.includes('*'),
      readAccess: (email: string) => readMails.includes('*') || readMails.includes(email),
    } as const;
  }

  static async listAccountsByUser(client: D1Database, session: UserSession) {
    let {kit, prisma} = usePrisma(client);
    let {readAccessAll, readMails} = await this.useAuthorize(client, session);
    let rawSql = PrismaKit.Raw.sql(
      'SELECT DISTINCT M.owner address from Mail M',
      PrismaKit.Raw.where([
        PrismaKit.Raw.ifIn('M.owner', readMails, !readAccessAll),
      ]),
      PrismaKit.Raw.orderBy(['M.owner'])
    );
    let accounts = await prisma.$queryRaw(rawSql) as any;
    if (readAccessAll) {
      return [{name: 'all', address: '*'}, ...accounts];
    }
    return accounts;
  }
}

