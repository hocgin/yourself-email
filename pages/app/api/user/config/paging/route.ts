import {NextRequest} from 'next/server';
import {getRequestContext} from "@cloudflare/next-on-pages";
import {UserService} from "@/service/db/user-service";
import {ContextKit, ResultKit} from '@hocgin/nextjs-kit';
import {UserConfigPagingRo} from "@/types/http";

export const runtime = 'edge'

/**
 * 分页查询用户配置
 */
const POST = ContextKit.withError(async (request: NextRequest) => {
  let session = await ContextKit.getSessionThrow(request);
  const {env, cf, ctx} = getRequestContext();
  let ro = await request.json() as UserConfigPagingRo;
  return ResultKit.success(await UserService.pagingBy(env.DB, ro, session));
});
export {POST};
