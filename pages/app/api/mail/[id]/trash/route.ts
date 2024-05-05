import {NextRequest} from 'next/server';
import {getRequestContext} from "@cloudflare/next-on-pages";
import {MailService} from "@/service/db/mail-service";
import {ContextKit, ResultKit} from '@hocgin/nextjs-kit';

export const runtime = 'edge'

/**
 * 回收站
 */
const PUT = ContextKit.withError(async (request: NextRequest, {params}) => {
  let session = await ContextKit.getSessionThrow(request);
  const {env, cf, ctx} = getRequestContext();
  return ResultKit.success((await MailService.setTrashById(env.DB, params.id, true, session)));
});
export {PUT};
