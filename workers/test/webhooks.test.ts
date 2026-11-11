import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { seed, testEnv, request, admin, reader } from './helpers';
import { receiveEmail } from '../src/server/inbound';
import { dispatchDelivery, enqueueDue, processWebhookQueue } from '../src/server/webhooks';
import { rows, stmt } from '../src/server/sql';
import {
	decryptSecret,
	encryptSecret,
	publicIp,
	signWebhook,
	validateWebhookTarget,
	verifyWebhook,
	webhookUrl,
} from '../src/server/webhook-security';
const box = 'hello@one.test';
function incoming(mid = '<webhook@test>', to = box, attachment = false) {
	const body = attachment
		? [
				'Content-Type: multipart/mixed; boundary="b"',
				'',
				'--b',
				'Content-Type: text/plain',
				'',
				'hello',
				'--b',
				'Content-Type: text/plain',
				'Content-Disposition: attachment; filename="hello.txt"',
				'',
				'hello',
				'--b--',
			]
		: ['Content-Type: text/plain', '', 'hello'];
	const raw = [`From: sender@example.com`, `To: ${to}`, `Message-ID: ${mid}`, 'Subject: Test', ...body].join('\r\n');
	return {
		from: 'sender@example.com',
		to,
		raw: new Response(raw).body!,
		rawSize: raw.length,
		setReject: vi.fn(),
	} as unknown as ForwardableEmailMessage;
}
async function endpoint(url = 'https://8.8.8.8/hook') {
	const response = await request('/api/admin/webhooks', admin, 'POST', { name: 'Test endpoint', url, mailboxes: [box] });
	expect(response.status).toBe(201);
	return ((await response.json()) as any).data as { id: string; secret: string };
}
async function firstDelivery() {
	return (await rows<any>(testEnv(), 'SELECT * FROM webhook_deliveries'))[0];
}
afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});
describe('webhook cryptography and public-only targets', () => {
	beforeEach(seed);
	it('encrypts secrets with authenticated encryption and never returns them in lists', async () => {
		const e = await endpoint();
		const stored = await stmt(testEnv(), 'SELECT encryptedSecret FROM webhook_endpoints WHERE id=?', e.id).first<{
			encryptedSecret: string;
		}>();
		expect(stored?.encryptedSecret).not.toContain(e.secret);
		expect(await decryptSecret(testEnv(), stored!.encryptedSecret)).toBe(e.secret);
		const another = await encryptSecret(testEnv(), e.secret);
		expect(another).not.toBe(stored!.encryptedSecret);
		await expect(decryptSecret(testEnv(), stored!.encryptedSecret.slice(0, -4) + 'AAAA')).rejects.toThrow();
		expect(await (await request('/api/admin/webhooks')).text()).not.toContain(e.secret);
		expect((await request('/api/admin/webhooks', reader)).status).toBe(403);
	});
	it('verifies exact body, timestamp and event ID, rejecting expired or tampered signatures', async () => {
		const timestamp = String(Math.floor(Date.now() / 1000)),
			signature = `v1=${await signWebhook('secret', timestamp, 'evt_1', '{"x":1}')}`;
		expect(await verifyWebhook('secret', timestamp, 'evt_1', '{"x":1}', signature)).toBe(true);
		expect(await verifyWebhook('secret', timestamp, 'evt_2', '{"x":1}', signature)).toBe(false);
		expect(await verifyWebhook('secret', timestamp, 'evt_1', '{"x":2}', signature)).toBe(false);
		expect(await verifyWebhook('secret', timestamp, 'evt_1', '{"x":1}', signature, Date.now() + 301000)).toBe(false);
	});
	it.each([
		'http://example.com',
		'https://user:pass@example.com',
		'https://example.com:8443',
		'https://localhost',
		'https://a.local',
		'https://a.internal',
		'https://127.0.0.1',
		'https://2130706433',
		'https://0x7f000001',
		'https://10.0.0.1',
		'https://169.254.169.254',
		'https://100.64.0.1',
		'https://192.168.1.1',
		'https://[::1]',
		'https://[::ffff:127.0.0.1]',
		'https://[fc00::1]',
		'https://example.com/#fragment',
	])('rejects unsafe URL %s', (url) => {
		expect(() => webhookUrl(url)).toThrow('公网 HTTPS');
	});
	it('accepts public IPv4/IPv6 and rejects mixed public/private DNS answers or changed DNS', async () => {
		expect(publicIp('8.8.8.8')).toBe(true);
		expect(publicIp('2606:4700:4700::1111')).toBe(true);
		const fetch = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					Status: 0,
					Answer: [
						{ type: 1, data: '8.8.8.8' },
						{ type: 1, data: '10.0.0.1' },
					],
				}),
			),
		);
		vi.stubGlobal('fetch', fetch);
		await expect(validateWebhookTarget('https://hooks.example.com')).rejects.toThrow();
		fetch.mockImplementation(async () => new Response(JSON.stringify({ Status: 0, Answer: [{ type: 1, data: '8.8.8.8' }] })));
		await expect(validateWebhookTarget('https://hooks.example.com')).resolves.toBeInstanceOf(URL);
		fetch.mockImplementation(async () => new Response(JSON.stringify({ Status: 0, Answer: [{ type: 1, data: '127.0.0.1' }] })));
		await expect(validateWebhookTarget('https://hooks.example.com')).rejects.toThrow();
	});
});
describe('transactional received events and reliable delivery', () => {
	beforeEach(seed);
	it('creates one event and delivery under concurrent receipt, including attachments', async () => {
		await endpoint();
		await Promise.all([receiveEmail(incoming(undefined, box, true), testEnv()), receiveEmail(incoming(undefined, box, true), testEnv())]);
		await receiveEmail(incoming(), testEnv());
		expect(await rows(testEnv(), 'SELECT id FROM messages')).toHaveLength(1);
		expect(await rows(testEnv(), 'SELECT id FROM attachments')).toHaveLength(1);
		expect(await rows(testEnv(), 'SELECT id FROM webhook_events')).toHaveLength(1);
		expect(await rows(testEnv(), 'SELECT id FROM webhook_deliveries')).toHaveLength(1);
		const event = (await rows<any>(testEnv(), 'SELECT payload FROM webhook_events'))[0];
		expect(event.payload).not.toContain('mailboxId');
		expect(event.payload).not.toContain('bodyKey');
		expect(JSON.parse(event.payload).data.mailbox).toBe(box);
	});
	it('freezes subscription targets and keeps separate deliveries for multiple endpoints', async () => {
		await endpoint();
		await endpoint('https://8.8.4.4/hook');
		await receiveEmail(incoming(), testEnv());
		expect(await rows(testEnv(), 'SELECT id FROM webhook_deliveries')).toHaveLength(2);
		await endpoint('https://1.1.1.1/hook');
		await receiveEmail(incoming(), testEnv());
		expect(await rows(testEnv(), 'SELECT id FROM webhook_deliveries')).toHaveLength(2);
	});
	it('rolls back mail and attachments when event persistence fails, then retries safely', async () => {
		await endpoint();
		await stmt(
			testEnv(),
			`CREATE TRIGGER fail_event BEFORE INSERT ON webhook_events BEGIN SELECT RAISE(FAIL,'event unavailable'); END`,
		).run();
		try {
			await expect(receiveEmail(incoming(undefined, box, true), testEnv())).rejects.toThrow();
			expect(await rows(testEnv(), 'SELECT id FROM messages')).toHaveLength(0);
			expect(await rows(testEnv(), 'SELECT id FROM attachments')).toHaveLength(0);
		} finally {
			await stmt(testEnv(), 'DROP TRIGGER fail_event').run();
		}
		await receiveEmail(incoming(undefined, box, true), testEnv());
		expect(await rows(testEnv(), 'SELECT id FROM webhook_events')).toHaveLength(1);
	});
	it('keeps mail after queue failure and allows cron to recover the outbox', async () => {
		await endpoint();
		const sendBatch = vi.fn().mockRejectedValueOnce(new Error('queue down')).mockResolvedValue(undefined),
			env = { ...testEnv(), WEBHOOK_QUEUE: { sendBatch } as unknown as Queue<{ deliveryId: string }> };
		await expect(receiveEmail(incoming(), env)).resolves.toBeUndefined();
		expect(await rows(testEnv(), 'SELECT id FROM messages')).toHaveLength(1);
		await enqueueDue(env);
		expect(sendBatch).toHaveBeenCalledTimes(2);
		expect(sendBatch.mock.calls[1][0][0].body).toEqual({ deliveryId: (await firstDelivery()).id });
	});
	it('claims one concurrent consumer, signs the request, and ignores later duplicate queue tasks', async () => {
		const e = await endpoint();
		await receiveEmail(incoming(), testEnv());
		const d = await firstDelivery();
		const fetch = vi.fn<typeof globalThis.fetch>();
		// 204 bodies must be null in standards-compliant Response implementations.
		fetch.mockImplementation(async () => new Response(null, { status: 204 }));
		vi.stubGlobal('fetch', fetch);
		await Promise.all([dispatchDelivery(testEnv(), d.id), dispatchDelivery(testEnv(), d.id)]);
		await dispatchDelivery(testEnv(), d.id);
		expect(fetch).toHaveBeenCalledOnce();
		const options = fetch.mock.calls[0][1] as RequestInit;
		expect(options.redirect).toBe('manual');
		const headers = options.headers as Record<string, string>;
		expect(
			await verifyWebhook(
				e.secret,
				headers['X-Yourself-Timestamp'],
				headers['X-Yourself-Event-Id'],
				options.body as string,
				headers['X-Yourself-Signature'],
			),
		).toBe(true);
		expect((await firstDelivery()).status).toBe('succeeded');
		expect(await rows(testEnv(), 'SELECT * FROM webhook_attempts')).toHaveLength(1);
	});
	it.each([408, 429, 500, 503])('retries HTTP %s with fixed delays', async (status) => {
		await endpoint();
		await receiveEmail(incoming(), testEnv());
		const d = await firstDelivery();
		vi.stubGlobal(
			'fetch',
			vi.fn().mockImplementation(async () => new Response('private-response', { status })),
		);
		const before = Date.now();
		await dispatchDelivery(testEnv(), d.id);
		const next = await firstDelivery();
		expect(next.status).toBe('pending');
		expect(next.nextAttemptAt).toBeGreaterThanOrEqual(before + 60000);
		expect(JSON.stringify(await rows(testEnv(), 'SELECT * FROM webhook_attempts'))).not.toContain('private-response');
	});
	it.each([301, 302, 400, 401, 404])('terminates HTTP %s without following redirects', async (status) => {
		await endpoint();
		await receiveEmail(incoming(), testEnv());
		const d = await firstDelivery(),
			fetch = vi.fn().mockImplementation(async () => new Response(null, { status, headers: { Location: 'http://127.0.0.1' } }));
		vi.stubGlobal('fetch', fetch);
		await dispatchDelivery(testEnv(), d.id);
		expect((await firstDelivery()).status).toBe('failed');
		expect(fetch).toHaveBeenCalledOnce();
	});
	it('exhausts network retries and replays with the same event ID and retained history', async () => {
		await endpoint();
		await receiveEmail(incoming(), testEnv());
		const d = await firstDelivery(),
			fetch = vi.fn().mockRejectedValue(new Error('timeout'));
		vi.stubGlobal('fetch', fetch);
		for (let i = 0; i < 6; i++) {
			await stmt(testEnv(), 'UPDATE webhook_deliveries SET nextAttemptAt=0 WHERE id=?', d.id).run();
			await dispatchDelivery(testEnv(), d.id);
		}
		expect((await firstDelivery()).status).toBe('failed');
		expect(fetch).toHaveBeenCalledTimes(6);
		const replay = await request(`/api/admin/webhook-deliveries/${encodeURIComponent(d.id)}/replay`, admin, 'POST', {});
		expect(replay.status).toBe(200);
		fetch.mockResolvedValue(new Response(null, { status: 204 }));
		await dispatchDelivery(testEnv(), d.id);
		expect(await firstDelivery()).toMatchObject({ eventId: d.eventId, status: 'succeeded', attempts: 7, cycleAttempts: 1 });
		expect(await rows(testEnv(), 'SELECT * FROM webhook_attempts')).toHaveLength(7);
	});
	it('recovers an expired consumer lease after HTTP success but failed result persistence', async () => {
		await endpoint();
		await receiveEmail(incoming(), testEnv());
		const d = await firstDelivery();
		const fetch = vi.fn().mockImplementation(async () => new Response(null, { status: 204 }));
		vi.stubGlobal('fetch', fetch);
		await stmt(
			testEnv(),
			`CREATE TRIGGER fail_delivery BEFORE UPDATE ON webhook_deliveries WHEN NEW.status='succeeded' BEGIN SELECT RAISE(FAIL,'result unavailable'); END`,
		).run();
		try {
			await expect(dispatchDelivery(testEnv(), d.id)).rejects.toThrow();
			expect((await firstDelivery()).status).toBe('processing');
		} finally {
			await stmt(testEnv(), 'DROP TRIGGER fail_delivery').run();
		}
		await stmt(testEnv(), 'UPDATE webhook_deliveries SET leaseUntil=0 WHERE id=?', d.id).run();
		await dispatchDelivery(testEnv(), d.id);
		expect(fetch).toHaveBeenCalledTimes(2);
		expect((await firstDelivery()).status).toBe('succeeded');
		const attempts = await rows<any>(testEnv(), 'SELECT * FROM webhook_attempts ORDER BY attempt');
		expect(attempts[0].error).toBe('LEASE_EXPIRED');
		expect(attempts[1].status).toBe(204);
	});
	it('cancels disabled endpoints, rejects replay while disabled and labels test events', async () => {
		const e = await endpoint();
		expect((await request(`/api/admin/webhooks/${e.id}/test`, admin, 'POST', {})).status).toBe(201);
		expect(JSON.parse((await rows<any>(testEnv(), 'SELECT payload FROM webhook_events'))[0].payload)).toMatchObject({
			test: true,
			data: { messageId: null },
		});
		const d = await firstDelivery();
		await request(`/api/admin/webhooks/${e.id}`, admin, 'PUT', {
			name: 'disabled',
			url: 'https://8.8.8.8/hook',
			mailboxes: [box],
			enabled: false,
		});
		expect((await firstDelivery()).status).toBe('cancelled');
		expect((await request(`/api/admin/webhook-deliveries/${encodeURIComponent(d.id)}/replay`, admin, 'POST', {})).status).toBe(409);
		const fetch = vi.fn();
		vi.stubGlobal('fetch', fetch);
		await dispatchDelivery(testEnv(), d.id);
		expect(fetch).not.toHaveBeenCalled();
	});
	it('acknowledges successful tasks and retries only infrastructure failures', async () => {
		const ack = vi.fn(),
			retry = vi.fn();
		await processWebhookQueue(
			{ messages: [{ id: 'q1', body: { deliveryId: 'missing' }, ack, retry }] } as unknown as MessageBatch<unknown>,
			testEnv(),
		);
		expect(ack).toHaveBeenCalledOnce();
		expect(retry).not.toHaveBeenCalled();
	});
});

describe('dispatch-time DNS and encryption configuration', () => {
	beforeEach(seed);
	it('revalidates DNS before posting and never sends to a newly private target', async () => {
		const fetch = vi
			.fn<typeof globalThis.fetch>()
			.mockImplementation(async () => new Response(JSON.stringify({ Status: 0, Answer: [{ type: 1, data: '8.8.8.8' }] })));
		vi.stubGlobal('fetch', fetch);
		await endpoint('https://hooks.example.com/hook');
		await receiveEmail(incoming(), testEnv());
		const d = await firstDelivery();
		fetch.mockClear();
		fetch.mockImplementation(async () => new Response(JSON.stringify({ Status: 0, Answer: [{ type: 1, data: '10.0.0.1' }] })));
		await dispatchDelivery(testEnv(), d.id);
		expect(fetch.mock.calls.every(([, options]) => options?.method !== 'POST')).toBe(true);
		expect(await firstDelivery()).toMatchObject({ status: 'failed', lastError: 'UNSAFE_WEBHOOK_URL' });
	});
	it('fails closed when the encryption master key is missing', async () => {
		await expect(encryptSecret({ ...testEnv(), WEBHOOK_MASTER_KEY: undefined }, 'secret')).rejects.toThrow('32 字节');
	});
});

describe('exhausted consumer recovery', () => {
	beforeEach(seed);
	it('does not make a seventh automatic HTTP attempt after an expired final lease', async () => {
		await endpoint();
		await receiveEmail(incoming(), testEnv());
		const d = await firstDelivery();
		await stmt(
			testEnv(),
			"UPDATE webhook_deliveries SET status='processing',attempts=6,cycleAttempts=6,leaseToken='dead',leaseUntil=0 WHERE id=?",
			d.id,
		).run();
		const fetch = vi.fn();
		vi.stubGlobal('fetch', fetch);
		await dispatchDelivery(testEnv(), d.id);
		expect(fetch).not.toHaveBeenCalled();
		expect(await firstDelivery()).toMatchObject({ status: 'failed', lastError: 'DELIVERY_INTERRUPTED', attempts: 6 });
	});
});
