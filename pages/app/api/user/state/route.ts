import {NextRequest} from 'next/server';
import {ContextKit, ResultKit} from '@hocgin/nextjs-kit'
import {UserService} from "@/service/db/user-service";
import {getRequestContext} from '@cloudflare/next-on-pages';

export const runtime = 'edge'

const GET = ContextKit.withError(async (request: NextRequest) => {
  let session = await ContextKit.getSessionThrow(request);
  const {env, cf, ctx} = getRequestContext();
  return ResultKit.success(await UserService.getState(env.DB, session));
});

export {GET};
