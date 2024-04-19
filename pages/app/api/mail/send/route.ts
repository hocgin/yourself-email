import {NextRequest} from 'next/server';
import {getRequestContext} from "@cloudflare/next-on-pages";
import {ContextKit, ResultKit} from "@hocgin/nextjs-kit";
import {MailService} from "@/service/db/mail-service";

export const runtime = 'edge'

const POST = ContextKit.withError(async (request: NextRequest) => {
  const {env, cf, ctx} = getRequestContext();
  await MailService.sendMail(env.DB, (await request.json()))
  return ResultKit.success();
})
export {POST};
