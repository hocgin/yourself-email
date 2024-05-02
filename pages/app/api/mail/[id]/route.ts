import {NextRequest} from 'next/server';
import {getRequestContext} from "@cloudflare/next-on-pages";
import {MailService} from "@/service/db/mail-service";
import {ContextKit, ResultKit} from '@hocgin/nextjs-kit';

export const runtime = 'edge'

/**
 * 邮件详情
 */
const GET = ContextKit.withError(async (request: NextRequest, {params}) => {
  const {env, cf, ctx} = getRequestContext();
  return ResultKit.success((await MailService.fetchById(env.DB, params.id)));
});
export {GET};
