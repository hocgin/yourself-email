import { beforeEach, describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { admin, reader, sender, seed, request, storedMessage, testEnv, draft } from './helpers';
import { db } from '../src/server/core';
import { attachments, grants, domains, messages, mailboxes } from '../src/server/schema';
describe('mailbox authorization and HTTP boundary', () => {
	beforeEach(seed);
	it('replaces many mailbox grants atomically without exceeding D1 bind limits', async () => {
		const boxes = Array.from({ length: 25 }, (_, i) => ({
			id: `many-${i}`,
			domainId: 'domain1',
			address: `many-${i}@one.test`,
			createdAt: Date.now(),
		}));
		for (const box of boxes) await db(testEnv()).insert(mailboxes).values(box);
		const res = await request('/api/admin/accounts/grants', admin, 'PUT', {
			email: reader.email,
			grants: boxes.map((b) => ({ mailboxId: b.id, canRead: true, canSend: false })),
		});
		expect(res.status).toBe(200);
		expect(((await (await request('/api/mailboxes', reader)).json()) as any).data).toHaveLength(25);
	});

	it('paginates deterministically when many messages have the same timestamp', async () => {
		await storedMessage();
		const template = await db(testEnv()).select().from(messages).get();
		for (let i = 0; i < 31; i++)
			await db(testEnv())
				.insert(messages)
				.values({ ...template!, id: `page-${String(i).padStart(2, '0')}`, dedupKey: `page-${i}` });
		const first = (await (await request('/api/messages?mailboxId=box1', reader)).json()) as any;
		const next = (await (
			await request(`/api/messages?mailboxId=box1&cursor=${encodeURIComponent(first.data.nextCursor)}`, reader)
		).json()) as any;
		expect(first.data.items).toHaveLength(30);
		expect(next.data.items).toHaveLength(2);
		expect(new Set([...first.data.items, ...next.data.items].map((m) => m.id)).size).toBe(32);
		expect(next.data.nextCursor).toBeNull();
	});

	it('requires a session and valid write origin', async () => {
		expect((await request('/api/me', null)).status).toBe(401);
		expect((await request('/api/admin/domains', admin, 'POST', { name: 'evil.test' }, { Origin: 'https://evil.test' })).status).toBe(403);
	});
	it('lists cross-domain mailboxes for admin, masks unread counts for send-only users', async () => {
		await storedMessage();
		const all = (await (await request('/api/mailboxes')).json()) as any;
		expect(all.data).toHaveLength(2);
		const send = (await (await request('/api/mailboxes', sender)).json()) as any;
		expect(send.data[0]).toMatchObject({ canRead: false, canSend: true, unreadCount: 0 });
	});
	it('denies list, detail, history, mutation and attachment ID access outside assigned mailboxes', async () => {
		const mid = await storedMessage('box2');
		for (const url of [`/api/messages?mailboxId=box2`, `/api/messages/${mid}`, `/api/messages/${mid}/history`])
			expect((await request(url, reader)).status).toBe(404);
		expect((await request(`/api/messages/${mid}`, reader, 'PATCH', { isRead: true })).status).toBe(404);
		await db(testEnv()).insert(attachments).values({
			id: 'private',
			mailboxId: 'box2',
			messageId: mid,
			key: 'private',
			filename: 'secret.txt',
			type: 'text/plain',
			size: 3,
			disposition: 'attachment',
			createdAt: Date.now(),
		});
		expect((await request('/api/attachments/private', reader)).status).toBe(404);
	});
	it('read-only users cannot send, send-only users cannot read messages', async () => {
		await storedMessage();
		expect((await request('/api/messages/send', reader, 'POST', draft, { 'Idempotency-Key': crypto.randomUUID() })).status).toBe(404);
		expect((await request('/api/messages/message1', sender)).status).toBe(404);
	});
	it('revocation takes effect without logging out', async () => {
		await storedMessage();
		expect((await request('/api/messages/message1', reader)).status).toBe(200);
		await db(testEnv()).delete(grants).where(eq(grants.userId, reader.id));
		expect((await request('/api/messages/message1', reader)).status).toBe(404);
	});
	it('shares read/archive/trash state across mailbox members', async () => {
		await storedMessage();
		expect((await request('/api/messages/message1', reader, 'PATCH', { isRead: true, isArchive: true, isTrash: true })).status).toBe(200);
		const m = (await (await request('/api/messages/message1', admin)).json()) as any;
		expect(m.data).toMatchObject({ isRead: true, isArchive: true, isTrash: true });
		expect(m.data.html).not.toContain('<script');
		expect(m.data.html).not.toContain('https://tracker.test');
	});
	it('disabling domains preserves historical read access', async () => {
		await storedMessage();
		await db(testEnv()).update(domains).set({ enabled: false }).where(eq(domains.id, 'domain1'));
		expect((await request('/api/messages/message1', reader)).status).toBe(200);
		expect((await request('/api/messages/send', sender, 'POST', draft, { 'Idempotency-Key': crypto.randomUUID() })).status).toBe(409);
	});
	it('normalizes domains, forbids duplicate addresses and supports multi-mailbox grants', async () => {
		expect((await request('/api/admin/domains', admin, 'POST', { name: ' THREE.TEST ' })).status).toBe(201);
		expect((await request('/api/admin/mailboxes', admin, 'POST', { address: 'HELLO@ONE.TEST' })).status).toBe(409);
		expect(
			(
				await request('/api/admin/accounts/grants', admin, 'PUT', {
					email: reader.email,
					grants: [
						{ mailboxId: 'box1', canRead: true, canSend: false },
						{ mailboxId: 'box2', canRead: true, canSend: true },
					],
				})
			).status,
		).toBe(200);
		const result = (await (await request('/api/mailboxes', reader)).json()) as any;
		expect(result.data).toHaveLength(2);
		expect((await request('/api/admin/accounts', reader)).status).toBe(403);
	});
	it('binds pagination and search values safely', async () => {
		await storedMessage();
		expect((await request('/api/messages?mailboxId=box1&cursor=broken', reader)).status).toBe(400);
		const result = (await (await request(`/api/messages?mailboxId=box1&q=${encodeURIComponent("' OR 1=1 --")}`, reader)).json()) as any;
		expect(result.data.items).toHaveLength(0);
	});
});
