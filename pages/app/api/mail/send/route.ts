import {NextRequest} from 'next/server';
import {getRequestContext} from '@cloudflare/next-on-pages';
import {ContextKit, ResultKit} from "@hocgin/nextjs-kit";
import {SendMailRo} from "../../../../types/http";
import {MailService} from "../../../../service/db/mail-service";

export const runtime = 'edge'

const POST = ContextKit.withError(async (request: NextRequest) => {
  const {env, cf, ctx} = getRequestContext();
  let payload = (await request.json()) as SendMailRo;
  try {
    await MailService.sendMail(env.DB, payload)
    return ResultKit.success();
  } catch (e) {
    return ResultKit.error(e.message);
  }
})
export {POST};
