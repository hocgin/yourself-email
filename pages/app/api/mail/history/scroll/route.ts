import {NextRequest} from 'next/server';
import {getRequestContext} from "@cloudflare/next-on-pages";
import {MailService} from "@/service/db/mail-service";
import {ContextKit, ResultKit} from '@hocgin/nextjs-kit';
import {QueryHistoryScrollRo} from "@/types/http";

export const runtime = 'edge'

const POST = ContextKit.withError(async (request: NextRequest) => {
  const {env, cf, ctx} = getRequestContext();
  let ro = await request.json() as QueryHistoryScrollRo;
  let result = await MailService.scrollByMail(env.DB, ro);
  return ResultKit.success(result);
});
export {POST};
