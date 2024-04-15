import type {D1Database} from "@cloudflare/workers-types";
import {DBKit} from "@/_utils/db";
import {QueryMailScrollRo} from "@/types/http";
import {PrismaKit} from "@/_utils/prisma";
import sql from "sql-template-tag";

export enum Schema {
  Mail = 'mail'
}

export class EmailService {

  static async scrollByMail(client: D1Database, ro: QueryMailScrollRo) {
    let [cli] = DBKit.getCli(client);
    let keyword = ro.keyword;
    let rawSql = PrismaKit.Raw.sql(
      'SELECT M.* FROM Mail M',
      PrismaKit.Raw.where([
        PrismaKit.Raw.if(sql`AND M.subject LIKE ${keyword}`, keyword),
        PrismaKit.Raw.if(sql`AND M.text LIKE ${keyword}`, keyword),
      ]),
      PrismaKit.Raw.orderBy(['id'])
    );
    return (await cli.scrollRaw(rawSql, ro));
  }

}
