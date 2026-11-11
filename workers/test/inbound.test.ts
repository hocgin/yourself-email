import { beforeEach, describe, it, expect, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import PostalMime from 'postal-mime';
import { admin, reader, sender, request, seed, testEnv } from './helpers';
import { receiveEmail } from '../src/server/inbound';
import { db } from '../src/server/core';
import { attachments, domains, grants, mailboxes, messages } from '../src/server/schema';
import { mailboxAccess } from '../src/server/permissions';
import type { Mailbox, MessageDetail } from '../src/shared/contracts';
function incoming(to = 'hello@one.test', messageId: string | null = '<same@example.test>', attachment = false) {
	const raw = [
		`From: Peer <peer@example.test>`,
		`To: spoofed@two.test`,
		`Reply-To: Support <reply@example.test>`,
		...(messageId ? [`Message-ID: ${messageId}`] : []),
		'Subject: Hello',
		'MIME-Version: 1.0',
		...(attachment
			? [
					'Content-Type: multipart/mixed; boundary="boundary"',
					'',
					'--boundary',
					'Content-Type: text/plain',
					'',
					'Hello',
					'--boundary',
					'Content-Type: text/plain',
					'Content-Disposition: attachment; filename="note.txt"',
					'Content-Transfer-Encoding: base64',
					'',
					'SGVsbG8=',
					'--boundary--',
				]
			: ['Content-Type: text/plain', '', 'Hello']),
	].join('\r\n');
	return {
		from: 'peer@example.test',
		to,
		raw: new Response(raw).body!,
		rawSize: new TextEncoder().encode(raw).length,
		setReject: vi.fn(),
	} as unknown as ForwardableEmailMessage;
}
describe('inbound email using real D1/R2', () => {
	beforeEach(seed);
	it('rejects oversized messages before consuming MIME content', async () => {
		const event = incoming();
		Object.defineProperty(event, 'rawSize', { value: 25 * 1024 * 1024 + 1 });
		await receiveEmail(event, testEnv());
		expect(event.setReject).toHaveBeenCalledWith('Message exceeds 25 MiB');
		expect(await db(testEnv()).select().from(messages)).toHaveLength(0);
	});

	it('uses envelope recipient instead of spoofed headers', async () => {
		await receiveEmail(incoming(), testEnv());
		const result = await db(testEnv()).select().from(messages);
		expect(result).toHaveLength(1);
		expect(result[0].mailboxId).toBe('box1');
		expect(result[0].replyTo).toEqual([{ email: 'reply@example.test', name: 'Support' }]);
		expect((await testEnv().MAIL_STORAGE.get(result[0].bodyKey))?.size).toBeGreaterThan(0);
	});
	it('creates a normal mailbox from the normalized envelope address, with admin-only initial access', async () => {
		const event = incoming(' Missing@ONE.TEST ', '<new@test>', true);
		await receiveEmail(event, testEnv());
		expect(event.setReject).not.toHaveBeenCalled();
		const box = await db(testEnv()).select().from(mailboxes).where(eq(mailboxes.address, 'missing@one.test')).get();
		expect(box).toMatchObject({ domainId: 'domain1', name: '', enabled: true });
		const message = await db(testEnv()).select().from(messages).get();
		expect(message?.mailboxId).toBe(box!.id);
		expect(message?.to).toEqual([{ email: 'spoofed@two.test', name: '' }]);
		const listed = await (await request('/api/mailboxes', admin)).json() as { data: Mailbox[] };
		expect(listed.data.find((b) => b.id === box!.id)).toMatchObject({ canRead: true, canSend: true, unreadCount: 1 });
		const detail = await (await request(`/api/messages/${message!.id}`, admin)).json() as { data: MessageDetail };
		expect(detail.data.text.trim()).toBe('Hello');
		expect(detail.data.attachments).toHaveLength(1);
		const fileUrl = `/api/attachments/${detail.data.attachments[0].id}`;
		expect(await (await request(fileUrl, admin)).text()).toBe('Hello');
		await expect(mailboxAccess(testEnv(), admin, box!.id, 'send')).resolves.toMatchObject({ id: box!.id });
		for (const user of [reader, sender]) {
			const visible = await (await request('/api/mailboxes', user)).json() as { data: Mailbox[] };
			expect(visible.data.some((b) => b.id === box!.id)).toBe(false);
			for (const url of [`/api/messages?mailboxId=${box!.id}`, `/api/messages/${message!.id}`, `/api/messages/${message!.id}/history`, fileUrl])
				expect((await request(url, user)).status).toBe(404);
			expect((await request(`/api/messages/${message!.id}`, user, 'PATCH', { isRead: true })).status).toBe(404);
			await expect(mailboxAccess(testEnv(), user, box!.id, 'send')).rejects.toMatchObject({ status: 404 });
		}
		expect(await db(testEnv()).select().from(grants).where(eq(grants.mailboxId, box!.id))).toHaveLength(0);
		expect((await request('/api/admin/accounts/grants', admin, 'PUT', {
			email: reader.email, grants: [{ mailboxId: box!.id, canRead: true, canSend: false }],
		})).status).toBe(200);
		expect((await request(`/api/messages/${message!.id}`, reader)).status).toBe(200);
		expect((await request(fileUrl, reader)).status).toBe(200);
	});
	it('rejects recipients on unregistered domains without creating mailboxes', async () => {
		const event = incoming('missing@unknown.test');
		await receiveEmail(event, testEnv());
		expect(event.setReject).toHaveBeenCalledWith('Unknown or disabled recipient');
		expect(await db(testEnv()).select().from(mailboxes)).toHaveLength(2);
		expect(await db(testEnv()).select().from(messages)).toHaveLength(0);
	});
	it('rejects existing and unknown recipients on disabled domains', async () => {
		await db(testEnv()).update(domains).set({ enabled: false }).where(eq(domains.id, 'domain1'));
		for (const address of ['hello@one.test', 'missing@one.test']) {
			const event = incoming(address);
			await receiveEmail(event, testEnv());
			expect(event.setReject).toHaveBeenCalledWith('Unknown or disabled recipient');
		}
		expect(await db(testEnv()).select().from(mailboxes)).toHaveLength(2);
		expect(await db(testEnv()).select().from(messages)).toHaveLength(0);
	});
	it('does not re-enable disabled mailboxes', async () => {
		await db(testEnv()).update(mailboxes).set({ enabled: false }).where(eq(mailboxes.id, 'box1'));
		const event = incoming();
		await receiveEmail(event, testEnv());
		expect(event.setReject).toHaveBeenCalledWith('Unknown or disabled recipient');
		expect(await db(testEnv()).select().from(mailboxes).where(eq(mailboxes.id, 'box1')).get()).toMatchObject({ enabled: false });
		expect(await db(testEnv()).select().from(messages)).toHaveLength(0);
	});
	it('creates one mailbox under concurrent deliveries and deduplicates retries', async () => {
		await Promise.all([
			receiveEmail(incoming('new@one.test', '<first@test>'), testEnv()),
			receiveEmail(incoming('new@one.test', '<first@test>'), testEnv()),
			receiveEmail(incoming('new@one.test', '<second@test>'), testEnv()),
		]);
		await receiveEmail(incoming('NEW@ONE.TEST', '<first@test>'), testEnv());
		expect(await db(testEnv()).select().from(mailboxes).where(eq(mailboxes.address, 'new@one.test'))).toHaveLength(1);
		expect(await db(testEnv()).select().from(messages)).toHaveLength(2);
	});
	it('creates separate mailboxes for distinct addresses including plus addresses', async () => {
		for (const address of ['new@one.test', 'new@two.test', 'hello+tag@one.test'])
			await receiveEmail(incoming(address), testEnv());
		expect(await db(testEnv()).select().from(mailboxes)).toHaveLength(5);
		const received = await db(testEnv()).select().from(messages);
		expect(new Set(received.map((m) => m.mailboxId)).size).toBe(3);
		expect(received.every((m) => m.mailboxId !== 'box1' && m.mailboxId !== 'box2')).toBe(true);
	});
	it.each(['declared', 'actual'])('does not create a mailbox for oversized %s content', async (size) => {
		const event = incoming('large@one.test');
		if (size === 'declared') Object.defineProperty(event, 'rawSize', { value: 25 * 1024 * 1024 + 1 });
		else Object.defineProperty(event, 'raw', { value: new Response(new Uint8Array(25 * 1024 * 1024 + 1)).body! });
		await receiveEmail(event, testEnv());
		expect(event.setReject).toHaveBeenCalledWith('Message exceeds 25 MiB');
		expect(await db(testEnv()).select().from(mailboxes)).toHaveLength(2);
		expect(await db(testEnv()).select().from(messages)).toHaveLength(0);
	});
	it('does not create a mailbox if MIME parsing fails', async () => {
		const parse = vi.spyOn(PostalMime, 'parse').mockRejectedValueOnce(new Error('parse failed'));
		try {
			await expect(receiveEmail(incoming('new@one.test'), testEnv())).rejects.toThrow('parse failed');
			expect(await db(testEnv()).select().from(mailboxes)).toHaveLength(2);
		} finally {
			parse.mockRestore();
		}
	});
	it('deduplicates by mailbox and message ID, preserving copies for different mailboxes', async () => {
		await receiveEmail(incoming(), testEnv());
		await receiveEmail(incoming(), testEnv());
		await receiveEmail(incoming('hello@two.test'), testEnv());
		expect(await db(testEnv()).select().from(messages)).toHaveLength(2);
	});
	it('deduplicates messages without IDs using raw content digest', async () => {
		await receiveEmail(incoming('hello@one.test', null), testEnv());
		await receiveEmail(incoming('hello@one.test', null), testEnv());
		expect(await db(testEnv()).select().from(messages)).toHaveLength(1);
	});
	it('persists MIME attachments as binary R2 objects', async () => {
		await receiveEmail(incoming('hello@one.test', '<attached@test>', true), testEnv());
		const files = await db(testEnv()).select().from(attachments);
		expect(files).toHaveLength(1);
		expect(await (await testEnv().MAIL_STORAGE.get(files[0].key))?.text()).toBe('Hello');
	});
	it('propagates storage failure and can safely retry', async () => {
		const broken = { ...testEnv(), MAIL_STORAGE: { put: vi.fn().mockRejectedValue(new Error('storage unavailable')) } };
		await expect(receiveEmail(incoming('retry@one.test'), broken as any)).rejects.toThrow('storage unavailable');
		expect(await db(testEnv()).select().from(messages)).toHaveLength(0);
		await receiveEmail(incoming('retry@one.test'), testEnv());
		expect(await db(testEnv()).select().from(mailboxes).where(eq(mailboxes.address, 'retry@one.test'))).toHaveLength(1);
		expect(await db(testEnv()).select().from(messages)).toHaveLength(1);
	});
	it('propagates D1 failure without acknowledging successful persistence', async () => {
		const broken = {
			...testEnv(),
			DB: {
				prepare: () => {
					throw new Error('D1 unavailable');
				},
			},
		};
		await expect(receiveEmail(incoming(), broken as any)).rejects.toThrow();
	});
});
