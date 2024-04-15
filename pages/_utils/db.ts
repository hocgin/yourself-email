import {PrismaD1} from "@prisma/adapter-d1";
import {PrismaClient} from "@prisma/client";
import {PrismaKit} from "./prisma";
import type {D1Database} from "@cloudflare/workers-types";

export class DBKit {
  static getCli(db: D1Database) {
    const adapter = new PrismaD1(db)
    const client = new PrismaClient({adapter, log: ["query", "info", "warn"]});
    return [PrismaKit.create(client), client] as const;
  }
}
