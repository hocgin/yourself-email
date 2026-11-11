import { beforeEach, describe, it, expect, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { seed, testEnv, sender, reader, storedMessage, draft, request, admin } from './helpers';
import { db, MAX_MESSAGE } from '../src/server/core';
import { attachments, mailboxes, messages } from '../src/server/schema';
import { sendEmail, estimateMessageBytes } from '../src/server/outbound';
import { sendInput } from '../src/shared/contracts';
import { cleanup } from '../src/server/maintenance';
function provider(impl = vi.fn().mockResolvedValue({ messageId: '<cloudflare@id.test>' })) {
	return { ...testEnv(), EMAIL: { send: impl } };
}
describe('outbound mail, idempotency and attachments', () => {
	beforeEach(seed);
	it.each(['', 'Sender Name'])('sends addresses with a runtime-valid name when the sender name is %j', async (name) => {
		const send = vi.fn(async (payload: Parameters<ReturnType<typeof testEnv>['EMAIL']['send']>[0]) => {
			for (const address of [payload.from, ...payload.to, ...(payload.cc || []), ...(payload.bcc || [])]) {
				if (typeof address !== 'string' && typeof address.name !== 'string')
					throw new TypeError("Incorrect type for the 'name' field on 'EmailAddress': the provided value is not of type 'string'.");
			}
			return { messageId: '<valid-addresses@test>' };
		});
		const env = provider(send);
		await db(env).update(mailboxes).set({ name }).where(eq(mailboxes.id, 'box1'));
		const recipients = [
			{ email: 'plain@example.test' },
			{ email: 'empty@example.test', name: '' },
			{ email: 'named@example.test', name: 'Recipient Name' },
		];
		expect(await sendEmail(env, sender, { ...draft, to: recipients, cc: recipients, bcc: recipients }, crypto.randomUUID()))
			.toMatchObject({ status: 'accepted', messageId: '<valid-addresses@test>' });
		const expected = ['plain@example.test', 'empty@example.test', { email: 'named@example.test', name: 'Recipient Name' }];
		expect(send).toHaveBeenCalledWith(expect.objectContaining({
			from: name ? { email: 'hello@one.test', name } : 'hello@one.test',
			to: expected, cc: expected, bcc: expected,
		}));
	});
	it('allows a deliberate retry with the same uploads after a definite rejection', async () => {
		const env = provider(
			vi
				.fn()
				.mockRejectedValueOnce(Object.assign(new Error('unverified'), { code: 'E_SENDER_NOT_VERIFIED' }))
				.mockResolvedValueOnce({ messageId: '<retried@test>' }),
		);
		await env.MAIL_STORAGE.put('retry-file', 'retry');
		await db(env)
			.insert(attachments)
			.values({
				id: 'retry-file',
				mailboxId: 'box1',
				userId: sender.id,
				key: 'retry-file',
				filename: 'retry.txt',
				type: 'text/plain',
				size: 5,
				disposition: 'attachment',
				createdAt: Date.now(),
			});
		const input = { ...draft, attachmentIds: ['retry-file'] };
		expect(await sendEmail(env, sender, input, crypto.randomUUID())).toMatchObject({ status: 'failed' });
		expect((await db(env).select().from(attachments).where(eq(attachments.id, 'retry-file')).get())?.messageId).toBeNull();
		expect(await sendEmail(env, sender, input, crypto.randomUUID())).toMatchObject({ status: 'accepted' });
		expect(env.EMAIL.send).toHaveBeenCalledTimes(2);
	});

	it('sends through the binding and records the provider ID; repeated keys never send twice', async () => {
		const env = provider(),
			key = crypto.randomUUID();
		const first = await sendEmail(env, sender, draft, key),
			second = await sendEmail(env, sender, draft, key);
		expect(first).toEqual(second);
		expect(first).toMatchObject({ status: 'accepted', messageId: '<cloudflare@id.test>' });
		expect(env.EMAIL.send).toHaveBeenCalledTimes(1);
		await expect(sendEmail(env, sender, { ...draft, subject: 'Different' }, key)).rejects.toThrow('同一发送键');
	});
	it('reserves only one send under concurrent identical requests', async () => {
		const env = provider(),
			key = crypto.randomUUID();
		const results = await Promise.all([sendEmail(env, sender, draft, key), sendEmail(env, sender, draft, key)]);
		expect(results[0].id).toBe(results[1].id);
		expect(env.EMAIL.send).toHaveBeenCalledTimes(1);
	});
	it.each(['E_SENDER_NOT_VERIFIED', 'E_RATE_LIMIT_EXCEEDED', 'E_INVALID_RECIPIENT'])('records definite rejection %s', async (code) => {
		const env = provider(vi.fn().mockRejectedValue(Object.assign(new Error('rejected'), { code })));
		expect(await sendEmail(env, sender, draft, crypto.randomUUID())).toMatchObject({ status: 'failed', errorCode: code });
	});
	it('records uncertain network outcomes and does not automatically retry', async () => {
		const env = provider(vi.fn().mockRejectedValue(new Error('timeout'))),
			key = crypto.randomUUID();
		expect(await sendEmail(env, sender, draft, key)).toMatchObject({ status: 'unknown' });
		await sendEmail(env, sender, draft, key);
		expect(env.EMAIL.send).toHaveBeenCalledTimes(1);
	});
	it('logs the failing stage and uncoded exception without mail content or addresses', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		try {
			const input = { ...draft, subject: 'Private subject', text: 'Private body', to: [{ email: 'private@example.test', name: 'Private Name' }] };
			const env = provider(vi.fn().mockRejectedValue(new TypeError('Cannot send Private subject Private body to Private Name <private@example.test>')));
			const key = crypto.randomUUID();
			const result = await sendEmail(env, sender, input, key);
			expect(result).toMatchObject({ status: 'unknown', errorCode: 'SEND_UNKNOWN' });
			expect(warn).toHaveBeenCalledWith('email_send_failed', expect.objectContaining({
				id: result.id, stage: 'provider_send', invoked: true, errorName: 'TypeError',
				errorMessage: 'Cannot send [redacted] [redacted] to [redacted] <[email]>',
			}));
			await sendEmail(env, sender, input, key);
			expect(env.EMAIL.send).toHaveBeenCalledTimes(1);
		} finally {
			warn.mockRestore();
		}
	});
	it('converts interrupted pending requests into unknown, preserving idempotency', async () => {
		const env = provider(),
			key = crypto.randomUUID(),
			result = await sendEmail(env, sender, draft, key);
		await db(env).update(messages).set({ sendState: 'pending', createdAt: 0 }).where(eq(messages.id, result.id));
		const { sendRequests } = await import('../src/server/schema');
		await db(env).update(sendRequests).set({ createdAt: 0 });
		expect(await sendEmail(env, sender, draft, key)).toMatchObject({ status: 'unknown' });
		expect(env.EMAIL.send).toHaveBeenCalledTimes(1);
	});
	it('sends threading headers for replies from the original mailbox', async () => {
		await storedMessage();
		const env = provider();
		await sendEmail(env, admin, { ...draft, replyToId: 'message1' }, crypto.randomUUID());
		expect(env.EMAIL.send.mock.calls[0][0].headers).toMatchObject({
			'In-Reply-To': '<message1@example.test>',
			References: '<message1@example.test>',
		});
	});
	it('enforces recipient count and MIME encoding size', () => {
		expect(sendInput.safeParse({ ...draft, to: Array.from({ length: 51 }, () => ({ email: 'a@test.com' })) }).success).toBe(false);
		expect(estimateMessageBytes(draft, [{ filename: 'big', size: 20 * 1024 * 1024 }])).toBeGreaterThan(MAX_MESSAGE);
	});
	it('binds uploads to user+mailbox and denies send-only users access after sending', async () => {
		const env = provider(),
			form = new FormData();
		form.set('mailboxId', 'box1');
		form.set('file', new File(['attachment bytes'], 'note.txt', { type: 'text/plain' }));
		const res = await (
			await import('../src/server/app')
		).app.request(
			'https://mail.example.test/api/attachments',
			{ method: 'POST', headers: { Origin: 'https://mail.example.test', Cookie: 'ym_session=token-sender' }, body: form },
			env,
		);
		expect(res.status).toBe(201);
		const { data: file } = (await res.json()) as any;
		await expect(sendEmail(env, admin, { ...draft, attachmentIds: [file.id] }, crypto.randomUUID())).rejects.toThrow('附件不存在');
		expect((await request(`/api/attachments/${file.id}`, sender)).status).toBe(200);
		await sendEmail(env, sender, { ...draft, attachmentIds: [file.id] }, crypto.randomUUID());
		expect((await request(`/api/attachments/${file.id}`, sender)).status).toBe(404);
		expect((await request(`/api/attachments/${file.id}`, reader)).status).toBe(200);
	});
	it('cleans expired orphan uploads but retains files attached to messages', async () => {
		await storedMessage();
		await testEnv().MAIL_STORAGE.put('expired', 'orphan');
		await testEnv().MAIL_STORAGE.put('retained', 'saved');
		await db(testEnv())
			.insert(attachments)
			.values(
				[
					{ id: 'old', key: 'expired', messageId: null },
					{ id: 'keep', key: 'retained', messageId: 'message1' },
				].map((f) => ({
					...f,
					mailboxId: 'box1',
					filename: 'file.txt',
					type: 'text/plain',
					size: 5,
					disposition: 'attachment',
					createdAt: 0,
				})),
			);
		await cleanup(testEnv());
		expect(await testEnv().MAIL_STORAGE.get('expired')).toBeNull();
		expect(await testEnv().MAIL_STORAGE.get('retained')).not.toBeNull();
	});
});
