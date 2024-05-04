import {NextRequest} from 'next/server';
import {getRequestContext} from "@cloudflare/next-on-pages";
import {MailService} from "@/service/db/mail-service";
import {ContextKit, ResultKit} from '@hocgin/nextjs-kit';

export const runtime = 'edge'

/**
 * 标记为未读
 */
const PUT = ContextKit.withError(async (request: NextRequest, {params}) => {
  const {env, cf, ctx} = getRequestContext();
  return ResultKit.success((await MailService.setReadyById(env.DB, params.id, false)));
});
export {PUT};
