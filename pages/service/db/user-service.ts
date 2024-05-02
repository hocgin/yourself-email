import type {D1Database} from "@cloudflare/workers-types";
import type {ListAccountVo} from "@/types/http";
import {PrismaKit, usePrisma} from "@/lib";
import sql from "sql-template-tag";
import {isSupperAdmin} from "@/lib/utils";

export class UserService {

  static async listAccountsByUser(client: D1Database) {
    let {kit, prisma} = usePrisma(client);

    let isSupperAdm = isSupperAdmin();

    let rawSql = PrismaKit.Raw.sql(
      'SELECT DISTINCT M.owner address from Mail M',
      // todo: 后续添加权限判断
      PrismaKit.Raw.where([
        // PrismaKit.Raw.if(sql`AND (M.subject LIKE ${keyword} OR M.text LIKE ${keyword})`, isSupperAdm),
      ]),
      PrismaKit.Raw.orderBy(['M.owner'])
    );

    return (await prisma.$queryRaw(rawSql));
  }
}
