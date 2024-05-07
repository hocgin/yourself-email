import {IMail} from "@/types/http";
import {getEmailName} from "@/lib/utils";
import Email from "@/lib/vercel-email";

export interface Params {
  from: IMail
  to: IMail[];
  cc?: IMail[];
  bcc?: IMail[];
  subject: string
  html?: string
  attachments?: string
}

export interface Dkim {
  dkim_domain?: string;
  dkim_selector?: string;
  dkim_private_key?: string;
}

export async function sendMail(ro: Params, env: CloudflareEnv) {
  let dkim = {};
  if (env.DKIM_DOMAIN && env.DKIM_SELECTOR && env.DKIM_PRIVATE_KEY) {
    dkim = {
      dkim_domain: env.DKIM_DOMAIN,
      dkim_selector: env.DKIM_SELECTOR,
      dkim_private_key: env.DKIM_PRIVATE_KEY,
    };
  }
  let asMail = (mail: IMail) => ({
    email: mail?.address,
    name: mail?.name ?? getEmailName(mail?.address),
  }), asMails = (mails: IMail[]) => {
    if (!mails?.length) return undefined;
    return mails.map(asMail);
  };
  ro.cc = ro?.cc ?? [];
  ro.bcc = ro?.bcc ?? [];
  let html = ro.html;
  if (html) {
    ro.html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><meta http-equiv="Content-Type" content="text/html charset=UTF-8" /><html lang="en"><body>${html}</body></html>`
  }
  let subject = ro.subject;
  await Email.send({
    to: asMails(ro.to), from: asMail(ro.from),
    cc: asMails(ro.cc), bcc: asMails(ro.bcc),
    subject: subject, html: ro.html,
    ...dkim,
  });
  return ro
}
