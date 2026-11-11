import { beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { seed, request, admin, reader, testEnv, storedMessage } from './helpers';
import { db, sha, type Bindings } from '../src/server/core';
import { messages, attachments, apiSendRequests } from '../src/server/schema';
import app from '../src/server/app';
import { stmt, rows } from '../src/server/sql';
import { renderTemplate } from '../src/server/templates';
import { templateContent, type Scope } from '../src/shared/open-contracts';
const address = 'hello@one.test';
async function createKey(scopes: Scope[] = ['mail:send', 'mail:read', 'attachment:read'], extra: Record<string, unknown> = {}) {
	const res = await request('/api/admin/api-keys', admin, 'POST', {
		name: 'Integration',
		mailboxes: [{ email: address, scopes }],
		...extra,
	});
	expect(res.status).toBe(201);
	return ((await res.json()) as any).data as { id: string; secret: string };
}
function open(secret: string, path: string, method = 'GET', body?: unknown, key?: string, env = testEnv()) {
	return app.request(
		`https://mail.example.test/api/open/v1${path}`,
		{
			method,
			headers: {
				Authorization: `Bearer ${secret}`,
				...(body ? { 'Content-Type': 'application/json' } : {}),
				...(key ? { 'Idempotency-Key': key } : {}),
			},
			body: body ? JSON.stringify(body) : undefined,
		},
		env,
	);
}
const ordinary = { from: address, to: [{ email: 'user@example.com' }], subject: 'Hello', text: 'Content' };
const mailPath = `/mailboxes/${encodeURIComponent(address)}/messages`;
describe('external API machine identities and strict quotas', () => {
	beforeEach(seed);
	it('only SSO admins manage keys; tokens are never stored or listed in plaintext', async () => {
		expect((await request('/api/admin/api-keys', reader)).status).toBe(403);
		const key = await createKey();
		const stored = await stmt(testEnv(), 'SELECT hash FROM api_keys WHERE id=?', key.id).first<{ hash: string }>();
		expect(stored?.hash).toBe(await sha(key.secret));
		const list = await (await request('/api/admin/api-keys')).text();
		expect(list).not.toContain(key.secret);
		expect(list).not.toContain('"hash"');
		expect(list).not.toContain('mailboxId');
		expect((await open(key.secret, '/mailboxes')).status).toBe(200);
		expect((await open(key.secret, '/../../admin/api-keys')).status).toBe(401);
	});
	it('accepts Bearer writes without Origin but retains browser Origin and session protection', async () => {
		const key = await createKey();
		const send = vi.fn().mockResolvedValue({ messageId: 'provider' });
		expect(
			(await open(key.secret, '/messages/send', 'POST', ordinary, crypto.randomUUID(), { ...testEnv(), EMAIL: { send } })).status,
		).toBe(200);
		expect(send).toHaveBeenCalledOnce();
		expect(
			(await app.request('https://mail.example.test/api/messages/send', { method: 'POST', body: JSON.stringify({}) }, testEnv())).status,
		).toBe(403);
		expect(
			(await app.request('https://mail.example.test/api/me', { headers: { Authorization: `Bearer ${key.secret}` } }, testEnv())).status,
		).toBe(401);
		const result = await open(key.secret, '/mailboxes');
		expect(result.headers.get('Access-Control-Allow-Origin')).toBeNull();
	});
	it('checks read/send/attachment grants independently and masks unknown resources', async () => {
		await storedMessage();
		const read = await createKey(['mail:read']),
			send = await createKey(['mail:send']);
		expect((await open(read.secret, '/messages/send', 'POST', ordinary, crypto.randomUUID())).status).toBe(404);
		expect((await open(send.secret, mailPath)).status).toBe(404);
		for (const email of ['hello@two.test', 'missing@one.test'])
			expect((await open(read.secret, `/mailboxes/${encodeURIComponent(email)}/messages`)).status).toBe(404);
		const detail = (await (await open(read.secret, `${mailPath}/message1`)).json()) as any;
		expect(detail.data).not.toHaveProperty('attachments');
		expect(detail.data).not.toHaveProperty('mailboxId');
		expect((await open(read.secret, `${mailPath}/message1/attachments`)).status).toBe(404);
		expect(
			(await request('/api/admin/api-keys', admin, 'POST', { name: 'bad', mailboxes: [{ email: address, scopes: ['attachment:read'] }] }))
				.status,
		).toBe(400);
	});
	it('revocation, disabling, expiry and grant updates apply on the next request', async () => {
		const key = await createKey();
		expect((await open(key.secret, '/mailboxes')).status).toBe(200);
		await request(`/api/admin/api-keys/${key.id}`, admin, 'PUT', {
			name: 'Changed',
			mailboxes: [{ email: address, scopes: ['mail:send'] }],
		});
		expect((await open(key.secret, mailPath)).status).toBe(404);
		await stmt(testEnv(), 'UPDATE api_keys SET enabled=0 WHERE id=?', key.id).run();
		expect((await open(key.secret, '/mailboxes')).status).toBe(401);
		await stmt(testEnv(), 'UPDATE api_keys SET enabled=1,expiresAt=? WHERE id=?', Date.now() - 1, key.id).run();
		expect((await open(key.secret, '/mailboxes')).status).toBe(401);
		await stmt(testEnv(), 'UPDATE api_keys SET expiresAt=NULL WHERE id=?', key.id).run();
		await request(`/api/admin/api-keys/${key.id}/revoke`, admin, 'POST', {});
		expect((await open(key.secret, '/mailboxes')).status).toBe(401);
	});
	it('strictly enforces concurrent quota without incrementing rejected calls', async () => {
		const key = await createKey(['mail:read'], { minuteLimit: 3, dayLimit: 20 });
		const responses = await Promise.all(Array.from({ length: 10 }, () => open(key.secret, '/mailboxes')));
		expect(responses.filter((r) => r.status === 200)).toHaveLength(3);
		expect(responses.filter((r) => r.status === 429)).toHaveLength(7);
		expect(Number(responses.find((r) => r.status === 429)!.headers.get('Retry-After'))).toBeGreaterThan(0);
		expect(await stmt(testEnv(), 'SELECT minuteCount,dayCount FROM api_keys WHERE id=?', key.id).first()).toEqual({
			minuteCount: 3,
			dayCount: 3,
		});
	});
	it('counts validation failures and idempotent retries; resets UTC windows independently', async () => {
		const key = await createKey(['mail:send'], { minuteLimit: 10, dayLimit: 3 });
		expect((await open(key.secret, '/messages/send', 'POST', {})).status).toBe(400);
		const send = vi.fn().mockResolvedValue({ messageId: 'provider' }),
			env = { ...testEnv(), EMAIL: { send } },
			idem = crypto.randomUUID();
		await open(key.secret, '/messages/send', 'POST', ordinary, idem, env);
		await open(key.secret, '/messages/send', 'POST', ordinary, idem, env);
		expect((await open(key.secret, '/mailboxes')).status).toBe(429);
		expect(send).toHaveBeenCalledOnce();
		await stmt(testEnv(), 'UPDATE api_keys SET minuteWindow=0 WHERE id=?', key.id).run();
		expect((await open(key.secret, '/mailboxes')).status).toBe(429);
		await stmt(testEnv(), 'UPDATE api_keys SET dayWindow=0 WHERE id=?', key.id).run();
		expect((await open(key.secret, '/mailboxes')).status).toBe(200);
	});
	it('logs failures with a request ID and excludes secrets and message contents', async () => {
		const key = await createKey();
		const response = await open(key.secret, '/messages/send', 'POST', { ...ordinary, text: 'sensitive-body' }, 'invalid');
		expect(response.status).toBe(400);
		const logs = await rows<any>(testEnv(), 'SELECT * FROM api_call_logs');
		expect(logs).toHaveLength(1);
		expect(logs[0]).toMatchObject({ id: response.headers.get('X-Request-Id'), status: 400, errorCode: 'VALIDATION_ERROR' });
		expect(JSON.stringify(logs)).not.toContain('sensitive-body');
		expect(JSON.stringify(logs)).not.toContain(key.secret);
	});
	it('hides internal mailbox IDs, normalizes addresses and supports multiple granted mailboxes', async () => {
		const key = await createKey(['mail:read'], {
			mailboxes: [
				{ email: ' HELLO@ONE.TEST ', scopes: ['mail:read'] },
				{ email: 'hello@two.test', scopes: ['mail:send'] },
			],
		});
		const list = (await (await open(key.secret, '/mailboxes')).json()) as any;
		expect(list.data).toHaveLength(2);
		expect(JSON.stringify(list)).not.toContain('mailboxId');
		expect(JSON.stringify(list)).not.toContain('box1');
		expect((await open(key.secret, '/mailboxes/HELLO%40ONE.TEST')).status).toBe(200);
	});
	it('preserves historical read access after mailbox/domain disabling and rejects sending', async () => {
		await storedMessage();
		const key = await createKey();
		await stmt(testEnv(), 'UPDATE domains SET enabled=0 WHERE id=?', 'domain1').run();
		expect((await open(key.secret, `${mailPath}/message1`)).status).toBe(200);
		expect((await open(key.secret, '/messages/send', 'POST', ordinary, crypto.randomUUID())).status).toBe(409);
	});
});
describe('external send idempotency and published templates', () => {
	beforeEach(seed);
	it('reserves one provider call for concurrent requests and isolates status by key', async () => {
		const a = await createKey(),
			b = await createKey(),
			send = vi.fn().mockResolvedValue({ messageId: 'provider' }),
			env = { ...testEnv(), EMAIL: { send } },
			idem = crypto.randomUUID();
		const results = await Promise.all([
			open(a.secret, '/messages/send', 'POST', ordinary, idem, env),
			open(a.secret, '/messages/send', 'POST', ordinary, idem, env),
		]);
		const payloads = (await Promise.all(results.map((r) => r.json()))) as any[];
		expect(payloads[0].data.id).toBe(payloads[1].data.id);
		expect(send).toHaveBeenCalledOnce();
		expect((await open(a.secret, '/messages/send', 'POST', { ...ordinary, subject: 'different' }, idem, env)).status).toBe(409);
		expect((await open(b.secret, `/messages/send/${payloads[0].data.id}`)).status).toBe(404);
		expect(await db(testEnv()).select().from(apiSendRequests)).toHaveLength(1);
	});
	it('keeps unknown outcomes and provider acceptance followed by D1 failure from resending', async () => {
		const key = await createKey(),
			idem = crypto.randomUUID();
		const send = vi.fn().mockImplementation(async () => {
			await stmt(
				testEnv(),
				`CREATE TRIGGER fail_accept BEFORE UPDATE ON messages WHEN NEW.sendState='accepted' BEGIN SELECT RAISE(FAIL,'simulated write failure'); END`,
			).run();
			return { messageId: 'accepted-but-unrecorded' };
		});
		try {
			const result = (await (
				await open(key.secret, '/messages/send', 'POST', ordinary, idem, { ...testEnv(), EMAIL: { send } })
			).json()) as any;
			expect(result.data.status).toBe('unknown');
			const repeated = (await (
				await open(key.secret, '/messages/send', 'POST', ordinary, idem, { ...testEnv(), EMAIL: { send } })
			).json()) as any;
			expect(repeated.data.status).toBe('unknown');
			expect(send).toHaveBeenCalledOnce();
		} finally {
			await stmt(testEnv(), 'DROP TRIGGER IF EXISTS fail_accept').run();
		}
	});
	it('rechecks key revocation before calling the provider', async () => {
		const key = await createKey(),
			send = vi.fn();
		const storage = {
			...testEnv().MAIL_STORAGE,
			put: async (...args: Parameters<R2Bucket['put']>) => {
				const result = await testEnv().MAIL_STORAGE.put(...args);
				await stmt(testEnv(), 'UPDATE api_keys SET revokedAt=? WHERE id=?', Date.now(), key.id).run();
				return result;
			},
		};
		const result = (await (
			await open(key.secret, '/messages/send', 'POST', ordinary, crypto.randomUUID(), {
				...testEnv(),
				EMAIL: { send },
				MAIL_STORAGE: storage,
			} as Bindings)
		).json()) as any;
		expect(result.data.status).toBe('failed');
		expect(send).not.toHaveBeenCalled();
	});
	it('uses only published versions and preserves rendered snapshots across publish/disable', async () => {
		const key = await createKey(),
			content = {
				subject: 'Code {{code}}',
				text: 'Hello {{username}} {{code}}',
				html: '<p>{{username}}</p>',
				variables: [
					{ name: 'username', required: true },
					{ name: 'code', required: true },
				],
			};
		const body = { code: 'verify', name: 'Verify', content };
		const created = (await (await request('/api/admin/templates', admin, 'POST', body)).json()) as any;
		const templateId = created.data.id,
			idem = crypto.randomUUID(),
			input = { from: address, to: ordinary.to, templateCode: 'verify', variables: { username: '<script>', code: 123 } },
			send = vi.fn().mockResolvedValue({ messageId: 'provider' }),
			env = { ...testEnv(), EMAIL: { send } };
		expect((await open(key.secret, '/messages/send', 'POST', input, idem, env)).status).toBe(404);
		await request(`/api/admin/templates/${templateId}/publish`, admin, 'POST', { versionId: created.data.draftVersionId });
		expect(
			(await open(key.secret, '/messages/send', 'POST', { ...input, variables: { username: 'test' } }, crypto.randomUUID(), env)).status,
		).toBe(400);
		const first = (await (await open(key.secret, '/messages/send', 'POST', input, idem, env)).json()) as any;
		expect(first.data.status).toBe('accepted');
		expect(send.mock.calls[0][0].html).toBe('<p>&lt;script&gt;</p>');
		const updated = (await (
			await request(`/api/admin/templates/${templateId}`, admin, 'PUT', { ...body, content: { ...content, subject: 'Changed {{code}}' } })
		).json()) as any;
		await request(`/api/admin/templates/${templateId}/publish`, admin, 'POST', { versionId: updated.data.draftVersionId });
		await request(`/api/admin/templates/${templateId}`, admin, 'PUT', { ...body, enabled: false });
		const retry = (await (
			await open(key.secret, '/messages/send', 'POST', { ...input, variables: { code: 123, username: '<script>' } }, idem, env)
		).json()) as any;
		expect(retry).toEqual(first);
		expect(send).toHaveBeenCalledOnce();
		expect((await db(testEnv()).select().from(apiSendRequests))[0]).toMatchObject({
			templateCode: 'verify',
			templateVersionId: created.data.draftVersionId,
		});
	});
	it('validates variable definitions, defaults, expressions and rendered length', () => {
		const content = templateContent.parse({
			subject: '{{a}}',
			text: '{{a}}',
			variables: [{ name: 'a', required: true, maxLength: 3, default: 'ok' }],
		});
		expect(renderTemplate(content, {}).text).toBe('ok');
		expect(() => renderTemplate(content, { a: 'long' })).toThrow('变量过长');
		expect(() => renderTemplate(content, { b: 'bad' })).toThrow('未声明变量');
		expect(() => renderTemplate({ ...content, text: '{{a.toString()}}' }, {})).toThrow('简单变量');
		expect(() => renderTemplate({ ...content, text: '{{b}}' }, {})).toThrow('未声明变量');
	});
});
describe('external inbound reads and attachment ownership', () => {
	beforeEach(seed);
	it('paginates inbound only with stable same-date cursors and honors filters in every folder', async () => {
		await storedMessage();
		const first = (await db(testEnv()).select().from(messages).get())!;
		for (let i = 0; i < 33; i++)
			await db(testEnv())
				.insert(messages)
				.values({ ...first, id: `in-${String(i).padStart(2, '0')}`, dedupKey: `in-${i}` });
		await db(testEnv())
			.insert(messages)
			.values({ ...first, id: 'out', dedupKey: 'out', direction: 'outbound', isArchive: true });
		const key = await createKey();
		const page = (await (await open(key.secret, `${mailPath}?limit=30`)).json()) as any;
		expect(page.data.items).toHaveLength(30);
		const next = (await (await open(key.secret, `${mailPath}?cursor=${encodeURIComponent(page.data.nextCursor)}`)).json()) as any;
		expect(next.data.items).toHaveLength(4);
		expect(new Set([...page.data.items, ...next.data.items].map((m) => m.id)).size).toBe(34);
		expect((await open(key.secret, `${mailPath}?unread=true&cursor=${encodeURIComponent(page.data.nextCursor)}`)).status).toBe(400);
		const archived = (await (await open(key.secret, `${mailPath}?folder=archive`)).json()) as any;
		expect(archived.data.items).toHaveLength(0);
		expect((await open(key.secret, `${mailPath}/out`)).status).toBe(404);
		const filtered = (await (await open(key.secret, `${mailPath}?from=nobody%40example.com`)).json()) as any;
		expect(filtered.data.items).toHaveLength(0);
		expect((await open(key.secret, `${mailPath}?since=invalid`)).status).toBe(400);
	});
	it('requires the full mailbox-message-attachment chain and does not mutate read state', async () => {
		await storedMessage();
		await storedMessage('box2', 'message2');
		await testEnv().MAIL_STORAGE.put('file', 'binary');
		for (const [fid, box, mid] of [
			['file1', 'box1', 'message1'],
			['file2', 'box2', 'message2'],
		])
			await db(testEnv()).insert(attachments).values({
				id: fid,
				mailboxId: box,
				messageId: mid,
				key: 'file',
				filename: 'hello.txt',
				type: 'text/plain',
				size: 6,
				disposition: 'attachment',
				createdAt: Date.now(),
			});
		const key = await createKey();
		expect(await (await open(key.secret, `${mailPath}/message1/attachments/file1`)).text()).toBe('binary');
		expect((await open(key.secret, `${mailPath}/message1/attachments/file2`)).status).toBe(404);
		expect((await open(key.secret, `${mailPath}/message2/attachments/file2`)).status).toBe(404);
		const detail = (await (await open(key.secret, `${mailPath}/message1`)).json()) as any;
		expect(detail.data.attachments).toHaveLength(1);
		expect(detail.data.html).not.toContain('<script');
		expect((await db(testEnv()).select().from(messages).where(eq(messages.id, 'message1')).get())!.isRead).toBe(false);
		expect(JSON.stringify(detail)).not.toContain('mailboxId');
		expect(JSON.stringify(detail)).not.toContain('bodyKey');
	});
});

describe('external audit retention', () => {
	beforeEach(seed);
	it('removes expired API metadata while retaining recent records and send idempotency', async () => {
		const key = await createKey();
		await open(key.secret, '/mailboxes');
		await stmt(
			testEnv(),
			"INSERT INTO api_call_logs(id,apiKeyId,operation,status,duration,createdAt) VALUES(?,?,'GET mailboxes.read',200,1,?)",
			'expired',
			key.id,
			Date.now() - 31 * 86400000,
		).run();
		await (await import('../src/server/maintenance')).cleanup(testEnv());
		expect(await rows(testEnv(), 'SELECT id FROM api_call_logs WHERE id=?', 'expired')).toHaveLength(0);
		expect(await rows(testEnv(), 'SELECT id FROM api_call_logs')).toHaveLength(1);
	});
});
