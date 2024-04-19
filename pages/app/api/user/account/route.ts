import {NextRequest} from 'next/server';
import {getRequestContext} from "@cloudflare/next-on-pages";
import {ContextKit, ResultKit} from '@hocgin/nextjs-kit';
import {UserService} from "@/service/db/user-service";

export const runtime = 'edge'

/**
 * 获取有权限的账号列表
 */
const GET = ContextKit.withError(async (request: NextRequest) => {
  const {env, cf, ctx} = getRequestContext();
  let result = await UserService.listAccountsByUser(env.DB);
  return ResultKit.success(result);
});
export {GET};
