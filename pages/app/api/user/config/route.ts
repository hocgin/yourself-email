import {NextRequest} from 'next/server';
import {getRequestContext} from "@cloudflare/next-on-pages";
import {UserService} from "@/service/db/user-service";
import {ContextKit, ResultKit} from '@hocgin/nextjs-kit';
import {UserConfigPagingRo} from "@/types/http";

export const runtime = 'edge'

/**
 * 新增
 */
const POST = ContextKit.withError(async (request: NextRequest) => {
  let session = await ContextKit.getSessionThrow(request);
  const {env, cf, ctx} = getRequestContext();
  return ResultKit.success(await UserService.save(env.DB, undefined, (await request.json()), session));
});
export {POST};
