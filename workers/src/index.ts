/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import {createMimeMessage} from "mimetext";
import PostalMime from "postal-mime";
import {EmailMessage} from "cloudflare:email";
import {streamToArrayBuffer} from './_utils'

export interface Env {
  // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
  // MY_KV_NAMESPACE: KVNamespace;
  //
  // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  // MY_DURABLE_OBJECT: DurableObjectNamespace;
  //
  // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
  // MY_BUCKET: R2Bucket;
  //
  // Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
  // MY_SERVICE: Fetcher;
  //
  // Example binding to a Queue. Learn more at https://developers.cloudflare.com/queues/javascript-apis/
  // MY_QUEUE: Queue;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return new Response('Hello World!');
  },
  /**
   * @param event
   * @param env
   * @param ctx
   * @see https://developers.cloudflare.com/email-routing/email-workers/runtime-api/#emailmessage-definition
   * @see https://developers.cloudflare.com/email-routing/email-workers/send-email-workers/
   * @see https://github.com/nodemailer/mailparser
   */
  async email(event, env, ctx) {
    console.log('get email');
    const rawEmail = await streamToArrayBuffer(event.raw, event.rawSize);
    const parser = new PostalMime();
    const parsed = await parser.parse(rawEmail);
    console.log('message=', {
      from: event.from,
      to: event.to,
      // headers: JSON.stringify(headersObject),
      rawSize: event.rawSize,
      body: JSON.stringify(parsed),
    });


    // Store received messages
    await env.DB.prepare(`
      INSERT INTO mail(headers, from_address, to_address, subject, date, html, text, attachments, message_id)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
    `).bind(JSON.stringify(parsed.headers), JSON.stringify(parsed.from), JSON.stringify(parsed.to), parsed.subject, parsed.date, parsed.html, parsed.text, JSON.stringify(parsed.attachments), parsed.messageId)
      .run()


    // const ticket = createTicket(message);
    // const msg = createMimeMessage();
    // msg.setHeader("In-Reply-To", event.headers.get("Message-ID"));
    // msg.setSender({name: "Thank you for you contact", addr: "<SENDER>@example.com"});
    // msg.setRecipient(event.from);
    // msg.setSubject("Email Routing Auto-reply");
    // msg.addMessage({
    //   contentType: 'text/plain',
    //   data: `We got your message, your ticket number is ${Date.now()}`
    // });
    //
    // const replyMessage = new EmailMessage(
    //   "<SENDER>@example.com",
    //   event.from,
    //   msg.asRaw()
    // );
    //
    // await event.reply(replyMessage);
  }
};
