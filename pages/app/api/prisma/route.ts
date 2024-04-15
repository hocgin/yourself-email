import {NextRequest, NextResponse} from 'next/server';
import {PrismaClient} from '@prisma/client'
import {getRequestContext} from '@cloudflare/next-on-pages';
import {PrismaD1} from '@prisma/adapter-d1'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const {env, cf, ctx} = getRequestContext();
  const adapter = new PrismaD1(env.DB)
  const prisma = new PrismaClient({adapter});
  let result = await prisma.mail.count();
  console.log('prisma.result', {result});
  return NextResponse.json(result);
}
