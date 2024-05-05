import {NextRequest} from 'next/server';
import {getRequestContext} from "@cloudflare/next-on-pages";
import {UserService} from "@/service/db/user-service";
import {ContextKit, ResultKit} from '@hocgin/nextjs-kit';
import {UserConfigPagingRo} from "@/types/http";

export const runtime = 'edge'

/**
 * 删除
 */
const DELETE = ContextKit.withError(async (request: NextRequest, {params}) => {
  let session = await ContextKit.getSessionThrow(request);
  const {env, cf, ctx} = getRequestContext();
  return ResultKit.success(await UserService.deleteById(env.DB, params.id, session));
});


/**
 * 修改
 */
const PUT = ContextKit.withError(async (request: NextRequest, {params}) => {
  let session = await ContextKit.getSessionThrow(request);
  const {env, cf, ctx} = getRequestContext();
  return ResultKit.success(await UserService.save(env.DB, params.id, (await request.json()), session));
});

export {DELETE, PUT};
