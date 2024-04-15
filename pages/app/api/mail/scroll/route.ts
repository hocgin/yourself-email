import {NextRequest, NextResponse} from 'next/server';
import {getRequestContext} from "@cloudflare/next-on-pages";
import {EmailService} from "@/service/db/email-service";

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  let ro = await request.json();
  console.log('scroll', {ro});
  const {env, cf, ctx} = getRequestContext();
  let result = await EmailService.scrollByMail(env.DB, ro);
  return NextResponse.json(result);
}
