import {NextRequest} from 'next/server';
import {getRequestContext} from "@cloudflare/next-on-pages";
import {ContextKit, ResultKit} from "@hocgin/nextjs-kit";
import {MailService} from "@/service/db/mail-service";

export const runtime = 'edge'

const POST = ContextKit.withError(async (request: NextRequest) => {
  let session = await ContextKit.getSessionThrow(request);
  const {env, cf, ctx} = getRequestContext();
  return ResultKit.success((await MailService.sendMail(env.DB, (await request.json()), session, env)));
})
export {POST};
