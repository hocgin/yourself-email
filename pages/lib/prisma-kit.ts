// import type {PrismaClient} from "@prisma/client";
import sql, {empty, join, raw, Sql} from "sql-template-tag";
import {CompleteRo, Paging, PagingRo, Scroll, ScrollRo} from "@hocgin/nextjs-kit";

export enum DBType {
  SQLite = 'sqlite',
  MySQL = 'mysql',
  PostgreSQL = 'postgresql',
}

type DBClient = any;


// https://github.com/blakeembrey/sql-template-tag
// https://www.prisma.io/docs/orm/prisma-client/queries/raw-database-access/raw-queries#sql-injection-prevention

export class PrismaKit {
  static SINGLETON: PrismaKit;
  client: DBClient;
  dbType: DBType;
  static Raw = {
    // https://github.com/blakeembrey/sql-template-tag/issues/38
    isEmpty(sql: Sql) {
      if (sql === empty) return false;
      return sql;
    },
    /**
     * condition
     * @param sql
     * @param condition
     */
    if(sql: Sql, condition: (boolean | any)) {
      if (!Boolean(condition)) return empty;
      return sql;
    },
    ifIn(field: string, values: any[], condition: (boolean | any)) {
      return PrismaKit.Raw.if(PrismaKit.Raw.in(field, values), condition);
    },
    in(field: string, values: any[]) {
      values = values.map(e => e);
      if (!values?.length) return empty;
      return PrismaKit.Raw.foreach(values, ",", `${field} IN(`, ")");
    },
    /**
     * ([a,b,c], ',', 'id IN (', ')')
     * = id IN(a,b,c)
     *
     * @param values
     * @param separator
     * @param prefix
     * @param suffix
     */
    foreach(values: any[] = [], separator?: string, prefix?: string, suffix?: string) {
      return join(values, separator, prefix, suffix);
    },
    where(raws: Sql[] = []) {
      raws = raws.filter(PrismaKit.Raw.isEmpty);
      if (!raws?.length) return empty;

      // 去除 WHERE 语句前面的 AND 或者 OR
      {
        let first = raws[0];
        let oldStrings = first.strings;
        oldStrings[0] = oldStrings[0].replace(/^\s+/, '').replace(/^(and|or)\s+/i, "");
        raws[0] = sql(oldStrings, ...first.values);
      }

      return join(raws, ' ', ' WHERE ');
    },
    orderBy(raws: string[] = []) {
      raws = raws.filter(e => e);
      if (!raws?.length) return empty;
      return raw(`ORDER BY ${raws.join(",")}`);
    },
    sql(select: string | Sql, whereRaws?: Sql, suffix?: Sql) {
      let selectSql = select;
      if (typeof select === 'string') {
        selectSql = raw(select);
      }
      return join([selectSql, whereRaws, suffix].filter(PrismaKit.Raw.isEmpty), ' ');
    },
    LLike(keyword?: string) {
      if (keyword?.length) return undefined;
      return `%${keyword}`;
    },
    ifLLike(field: string, keyword: (string | any), condition: (boolean | any)) {
      if (!Boolean(condition)) return empty;
      let resolveKeyword = PrismaKit.Raw.LLike(keyword);
      if (!resolveKeyword) return empty;
      return join([sql`${field} LIKE ${resolveKeyword}`], ' ', ` ${field} `);
    },
    RLike(keyword?: string) {
      if (keyword?.length) return undefined;
      return `${keyword}%`;
    },
    ifRLike(field: string, keyword: (string | any), condition: (boolean | any)) {
      if (!Boolean(condition)) return empty;
      let resolveKeyword = PrismaKit.Raw.RLike(keyword);
      if (!resolveKeyword) return empty;
      return join([sql`${field} LIKE ${resolveKeyword}`], ' ', ` ${field} `);
    },
    like(keyword?: string) {
      if (keyword?.length) return undefined;
      return `%${keyword}%`;
    },
    ifLike(field: string, keyword: (string | any), condition: (boolean | any)) {
      if (!Boolean(condition)) return empty;
      let resolveKeyword = PrismaKit.Raw.like(keyword);
      if (!resolveKeyword) return empty;
      return join([sql`${field} LIKE ${resolveKeyword}`], ' ', ` ${field} `);
    },
  } as const;

  /**
   * 创建
   * @param client
   * @param dbType
   */
  static create(client: DBClient, dbType: DBType = DBType.MySQL) {
    PrismaKit.SINGLETON = new PrismaKit();
    PrismaKit.SINGLETON.client = client;
    PrismaKit.SINGLETON.dbType = dbType;
    return PrismaKit.SINGLETON;
  }

  /**
   * field like '%xx%'
   * @param fields
   * @param keyword
   */
  contains(fields: string[], keyword?: string) {
    if (!keyword.trim?.()?.length || !fields?.length) return [];
    return fields.map(e => ({[e]: {contains: keyword}}));
  }

  /**
   * 检索查询
   * @param table
   * @param ro
   * @param where
   * @param orderBy
   */
  async complete<T = any>(table: T | any, ro: CompleteRo = {}, where: any = {}, orderBy: any = []) {
    ro.size = ro?.size ?? 10;
    let {skip, take} = PrismaKit.ofPage(ro);
    return (await table.findMany({skip, take, where, orderBy}));
  }

  /**
   * 分页查询
   * @param table
   * @param ro
   * @param where
   * @param orderBy
   */
  async paging<T = any>(table: T | any, ro: PagingRo = {}, where = {}, orderBy = []): Promise<Paging<T>> {
    ro.page = ro?.page ?? 1;
    ro.size = ro?.size ?? 10;
    let {skip, take} = PrismaKit.ofPage(ro);
    let total = await table.count({where});
    let records = await table.findMany({skip, take, where, orderBy});
    return new Paging(records, total, ro.size, ro.page);
  }

  /**
   * 滚动查询
   * @param table
   * @param ro
   * @param where
   * @param orderBy
   */
  async scroll<T = any>(table: T | any, ro: ScrollRo = {}, where: any = {}, orderBy: any = []): Promise<Scroll<T>> {
    ro.nextId = ro?.nextId ?? 1;
    ro.size = ro?.size ?? 10;
    let {skip, take} = PrismaKit.ofScroll(ro);
    let records = await table.findMany({skip, take, where, orderBy});
    return new Scroll(records, ro.size, ro.nextId);
  }

  /**
   * 保存或更新
   * @param table
   * @param entity
   * @param id
   */
  async saveOrUpdate<T = any>(table: T | any, entity: any, id?: string) {
    if (id) {
      return (await table.update({where: {id}, data: entity}));
    } else {
      return (await table.create({data: entity}));
    }
  }

  static ofPage(ro: PagingRo = {}): { skip: number; take: number } {
    let page = ro?.page ?? 1, size = ro?.size ?? 10;
    let skip = Math.max((page - 1) * size, 0);
    return {skip, take: size};
  }

  static ofScroll(ro: ScrollRo = {}): { skip: number; take: number } {
    let page = ro?.nextId ?? 1, size = ro?.size ?? 10;
    let skip = Math.max((page - 1) * size, 0);
    return {skip, take: size};
  }

  // ======================== [Raw] ========================
  async completeRaw<T = any>(rawSql: Sql, ro: CompleteRo = {}) {
    ro.size = ro?.size ?? 10;
    let resolveSql = join([rawSql, sql`LIMIT ${ro?.size}`], ' ');
    return (await PrismaKit.SINGLETON.client.$queryRaw(resolveSql)) as T[];
  }

  async firstRaw<T = any>(rawSql: Sql) {
    let resolveSql = join([rawSql, raw(`LIMIT 1`)], ' ');
    return (await PrismaKit.SINGLETON.client.$queryRaw(resolveSql))?.[0] as T;
  }

  async pagingRaw<T = any>(rawSql: Sql, ro: PagingRo = {}) {
    ro.page = ro?.page ?? 1;
    ro.size = ro?.size ?? 10;
    let {skip, take} = PrismaKit.ofPage(ro);
    let total = await this.countRaw(rawSql);
    let resolveSql = join([rawSql, sql`LIMIT ${take} OFFSET ${skip}`], ' ');
    let records: T[] = await PrismaKit.SINGLETON.client.$queryRaw(resolveSql) ?? [];
    return new Paging(records, total, ro.size, ro.page);
  }

  async scrollRaw<T = any>(rawSql: Sql, ro: ScrollRo = {}) {
    ro.nextId = ro?.nextId ?? 1;
    ro.size = ro?.size ?? 10;
    let {skip, take} = PrismaKit.ofScroll(ro);
    let resolveSql = join([rawSql, sql`LIMIT ${take} OFFSET ${skip}`], ' ');
    let records: T[] = await PrismaKit.SINGLETON.client.$queryRaw(resolveSql) ?? [];
    return new Scroll(records, ro.size, ro.nextId);
  }

  async countRaw(rawSql: Sql) {
    if ([DBType.PostgreSQL].includes(PrismaKit.SINGLETON.dbType)) {
      let resolveSql = sql`SELECT COUNT(1) AS count
                           FROM (${rawSql}) AS t`;
      let result = await PrismaKit.SINGLETON.client.$queryRaw(resolveSql);
      let str = `${result?.[0]?.count}`;
      if (str?.length) return Number(str);
    }
    //
    else {
      let resolveSql = sql`SELECT CAST(COUNT(1) AS SIGNED) AS count
                           FROM (${rawSql}) AS t`;
      let result = await PrismaKit.SINGLETON.client.$queryRaw(resolveSql)
      let str = `${result?.[0]?.count}`.replace('n', '');
      if (str?.length) return Number(str);
    }
    return 0;
  }
}
