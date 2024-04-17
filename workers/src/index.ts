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
import {streamToArrayBuffer, extractEmail} from './_utils'


export default {
  /**
   * @param event
   * @param env
   * @param ctx
   * @see https://developers.cloudflare.com/email-routing/email-workers/runtime-api/#emailmessage-definition
   * @see https://developers.cloudflare.com/email-routing/email-workers/send-email-workers/
   * @see https://github.com/nodemailer/mailparser
   */
  async email(event, env, ctx) {
    try {
      const parsed = await PostalMime.parse(event.raw);
      let owner = parsed.deliveredTo ?? extractEmail(parsed.headers) ?? 'unknown_owner';

      console.log('body', [
        JSON.stringify(parsed.headers), JSON.stringify(parsed.from), JSON.stringify(parsed.sender),
        JSON.stringify(parsed.replyTo), parsed.deliveredTo, parsed.returnPath, JSON.stringify(parsed.to),
        JSON.stringify(parsed.cc), JSON.stringify(parsed.bcc), parsed.subject, parsed.messageId,
        parsed.inReplyTo, parsed.references, parsed.date, parsed.html, parsed.text,
        JSON.stringify(parsed.attachments), owner
      ]);

      // Store received messages
      let prepareRaw = (env.DB as D1Database).prepare(`
        INSERT INTO Mail(headers, from_address, sender,
                         reply_to, delivered_to, return_path, to_address,
                         cc, bcc, subject, message_id,
                         in_reply_to, reference, date, html, text,
                         attachments, owner)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)
      `).bind(
        JSON.stringify(parsed.headers) ?? null, JSON.stringify(parsed.from) ?? null, JSON.stringify(parsed.sender) ?? null,
        JSON.stringify(parsed.replyTo) ?? null, parsed.deliveredTo ?? null, parsed.returnPath ?? null, JSON.stringify(parsed.to) ?? null,
        JSON.stringify(parsed.cc) ?? null, JSON.stringify(parsed.bcc) ?? null, parsed.subject ?? null, parsed.messageId ?? null,
        parsed.inReplyTo ?? null, parsed.references ?? null, parsed.date ?? null, parsed.html ?? null, parsed.text ?? null,
        JSON.stringify(parsed.attachments) ?? null, owner ?? null
      );
      let resp = await prepareRaw.run();
      console.log('resp', resp.meta);
    } catch (e) {
      console.warn('error', e);
    }


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

