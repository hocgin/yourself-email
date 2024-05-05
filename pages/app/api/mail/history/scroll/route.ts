import {NextRequest} from 'next/server';
import {getRequestContext} from "@cloudflare/next-on-pages";
import {MailService} from "@/service/db/mail-service";
import {ContextKit, ResultKit} from '@hocgin/nextjs-kit';
import {ChatHistoryScrollRo, ChatUserScrollRo, MailScrollRo} from "@/types/http";

export const runtime = 'edge'

/**
 * 根据查询用户列表和最新接收记录
 */
const POST = ContextKit.withError(async (request: NextRequest) => {
  let session = await ContextKit.getSessionThrow(request);
  const {env, cf, ctx} = getRequestContext();
  let ro = await request.json() as ChatHistoryScrollRo;
  return ResultKit.success(await MailService.scrollByChatHistory(env.DB, ro, session));
});
export {POST};
