import {PrismaClient} from '@prisma/client'
import {PrismaD1} from '@prisma/adapter-d1'
import type {DefaultArgs} from '@prisma/client/runtime/library'
import type {D1Database} from "@cloudflare/workers-types";
import {PrismaKit} from "./prisma-kit";

export type DBCliType = { kit: PrismaKit, prisma: PrismaClient };
let prisma: PrismaClient<{ adapter: PrismaD1 }, never, DefaultArgs>

export function usePrisma(d1: D1Database) {
  if (!prisma) {
    const adapter = new PrismaD1(d1)
    prisma = new PrismaClient({adapter})
  }
  return {kit: PrismaKit.create(prisma), prisma} as DBCliType;
}
