import {NextRequest} from 'next/server';
import {getRequestContext} from "@cloudflare/next-on-pages";
import {MailService} from "@/service/db/mail-service";
import {ContextKit, ResultKit} from '@hocgin/nextjs-kit';
import {ListAccountVo, QueryHistoryScrollRo} from "@/types/http";

export const runtime = 'edge'

/**
 * 获取有权限的账号列表
 */
const GET = ContextKit.withError(async (request: NextRequest) => {
  // const {env, cf, ctx} = getRequestContext();
  // let ro = await request.json() as QueryMailScrollRo;
  // let result = await MailService.scrollByMail(env.DB, ro);
  return ResultKit.success([{
    "address": "hocgin@gmail.com",
    "name": "夏不来"
  }, {
    "address": "cc@hocg.in",
    "name": ""
  }] as ListAccountVo);
});
export {GET};
