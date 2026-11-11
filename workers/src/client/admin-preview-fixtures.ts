/** Explicit DEV preview only. Mutations stay in memory; no callbacks, grants or secrets are real. */
import { domainInput, mailboxInput, grantInput, type Mailbox, type Identity } from '../shared/contracts';
import { keyInput, webhookInput, type Scope } from '../shared/open-contracts';
export function createAdminPreview(boxes: Mailbox[], user: Identity) {
	const domains = [
		{ id: 'example', name: 'example.com', enabled: true, createdAt: 0 },
		{ id: 'studio', name: 'studio.example', enabled: true, createdAt: 0 },
	];
	for (const row of [
		{ id: 'support', address: 'support@example.com', name: '客户支持', domainId: 'example', enabled: true },
		{ id: 'billing', address: 'billing@example.com', name: '财务通知', domainId: 'example', enabled: true },
		{ id: 'notify', address: 'notify@studio.example', name: '系统通知', domainId: 'studio', enabled: true },
	])
		if (!boxes.some((box) => box.id === row.id)) boxes.push({ ...row, domainEnabled: true, canRead: true, canSend: true, unreadCount: 0 });
	const accounts = [
		{
			id: user.id,
			email: user.email,
			issuer: 'preview',
			subject: 'preview-user' as string | null,
			grants: boxes.map((b) => ({ mailboxId: b.id, canRead: true, canSend: true })),
		},
		{
			id: 'teammate',
			email: 'teammate@example.com',
			issuer: 'preview',
			subject: 'teammate' as string | null,
			grants: [{ mailboxId: 'support', canRead: true, canSend: true }],
		},
		{
			id: 'pending',
			email: 'newmember@example.com',
			issuer: 'preview',
			subject: null as string | null,
			grants: [] as { mailboxId: string; canRead: boolean; canSend: boolean }[],
		},
	];
	const now = Date.parse('2026-11-12T09:40:00+08:00');
	const keys = [
		{
			id: 'notification',
			name: '网站通知服务',
			prefix: 'ym_demo_7b21',
			enabled: 1,
			revokedAt: null as number | null,
			expiresAt: null as number | null,
			minuteLimit: 60,
			dayLimit: 10000,
			lastUsedAt: now as number | null,
			mailboxes: [{ email: 'support@example.com', scopes: ['mail:send'] as Scope[] }],
		},
		{
			id: 'archive',
			name: '收件归档服务',
			prefix: 'ym_demo_4a91',
			enabled: 1,
			revokedAt: null as number | null,
			expiresAt: null as number | null,
			minuteLimit: 30,
			dayLimit: 5000,
			lastUsedAt: (now - 3600000) as number | null,
			mailboxes: [{ email: 'hello@example.com', scopes: ['mail:read', 'attachment:read'] as Scope[] }],
		},
	];
	const endpoints = [
		{
			id: 'support-hook',
			name: '客服收件通知',
			url: 'https://hooks.example.com/mail',
			enabled: 1,
			mailboxes: ['support@example.com'],
			lastDelivery: { status: 'failed', lastStatus: 503 } as { status: string; lastStatus: number | null } | null,
		},
		{
			id: 'archive-hook',
			name: '归档事件订阅',
			url: 'https://archive.example.com/events',
			enabled: 1,
			mailboxes: ['hello@example.com'],
			lastDelivery: { status: 'succeeded', lastStatus: 200 } as { status: string; lastStatus: number | null } | null,
		},
	];
	const deliveries = [
		{
			id: 'event-demo-failed:support-hook',
			endpointId: 'support-hook',
			endpointName: '客服收件通知',
			status: 'failed',
			attempts: 3,
			lastStatus: 503 as number | null,
			lastError: 'UPSTREAM_UNAVAILABLE' as string | null,
			createdAt: now,
			payload: JSON.stringify({ eventId: 'event-demo-failed', event: 'email.received', test: false }),
		},
		{
			id: 'event-demo-ok:archive-hook',
			endpointId: 'archive-hook',
			endpointName: '归档事件订阅',
			status: 'succeeded',
			attempts: 1,
			lastStatus: 200 as number | null,
			lastError: null as string | null,
			createdAt: now - 60000,
			payload: JSON.stringify({ eventId: 'event-demo-ok', event: 'email.received', test: false }),
		},
	];
	const logs = Array.from({ length: 8 }, (_, index) => ({
		id: `demo-request-${index + 1}`,
		apiKeyId: index % 2 ? 'archive' : 'notification',
		keyName: index % 2 ? '收件归档服务' : '网站通知服务',
		prefix: index % 2 ? 'ym_demo_4a91' : 'ym_demo_7b21',
		operation: index % 2 ? 'mail.list' : 'mail.send',
		mailbox: index % 2 ? 'hello@example.com' : 'support@example.com',
		status: index === 2 ? 429 : index === 5 ? 503 : 200,
		errorCode: index === 2 ? 'RATE_LIMIT_EXCEEDED' : index === 5 ? 'SERVICE_UNAVAILABLE' : null,
		duration: 40 + index * 17,
		createdAt: now - index * 60000,
	}));
	return (path: string, method: string, body: BodyInit | null | undefined, query: URLSearchParams): Response | undefined => {
		if (!path.startsWith('/admin/') || path.startsWith('/admin/templates')) return;
		const ok = (data: unknown, status = 200) => Response.json({ data }, { status });
		const fail = (message: string, status = 400) => Response.json({ error: { code: 'PREVIEW', message } }, { status });
		try {
			const input = typeof body === 'string' ? JSON.parse(body) : {};
			if (path === '/admin/domains' && method === 'GET') return ok(domains);
			if (path === '/admin/domains' && method === 'POST') {
				const data = domainInput.parse(input);
				if (domains.some((d) => d.name === data.name)) return fail('域名已存在', 409);
				const row = { ...data, id: crypto.randomUUID(), createdAt: Date.now() };
				domains.push(row);
				return ok(row, 201);
			}
			if (path.startsWith('/admin/domains/') && method === 'PATCH') {
				const row = domains.find((d) => d.id === path.split('/')[3]);
				if (!row) return fail('域名不存在', 404);
				row.enabled = !!input.enabled;
				boxes.forEach((box) => {
					if (box.domainId === row.id) box.domainEnabled = row.enabled;
				});
				return ok(row);
			}
			if (path === '/admin/mailboxes' && method === 'GET') return ok([...boxes].sort((a, b) => a.address.localeCompare(b.address)));
			if (path === '/admin/mailboxes' && method === 'POST') {
				const data = mailboxInput.parse(input),
					domain = domains.find((d) => d.name === data.address.split('@')[1]);
				if (!domain) return fail('请先添加对应域名');
				if (boxes.some((b) => b.address === data.address)) return fail('邮箱地址已存在', 409);
				const row = {
					...data,
					id: crypto.randomUUID(),
					domainId: domain.id,
					domainEnabled: domain.enabled,
					canRead: true,
					canSend: true,
					unreadCount: 0,
				};
				boxes.push(row);
				return ok(row, 201);
			}
			if (path.startsWith('/admin/mailboxes/') && method === 'PATCH') {
				const row = boxes.find((b) => b.id === path.split('/')[3]);
				if (!row) return fail('邮箱不存在', 404);
				Object.assign(row, mailboxInput.pick({ name: true, enabled: true }).parse(input));
				return ok(row);
			}
			if (path === '/admin/accounts' && method === 'GET') return ok(accounts);
			if (path === '/admin/accounts/grants' && method === 'PUT') {
				const data = grantInput.parse(input);
				let row = accounts.find((a) => a.email === data.email);
				if (!row) {
					row = { id: crypto.randomUUID(), email: data.email, issuer: 'preview', subject: null, grants: [] };
					accounts.push(row);
				}
				row.grants = data.grants.filter((g) => g.canRead || g.canSend);
				return ok(true);
			}
			if (path === '/admin/api-keys' && method === 'GET') return ok(keys);
			if (path === '/admin/api-keys' && method === 'POST') {
				const data = keyInput.parse(input),
					id = crypto.randomUUID();
				keys.unshift({ ...data, id, prefix: 'ym_demo_new', enabled: Number(data.enabled), revokedAt: null, lastUsedAt: null });
				return ok({ id, secret: `ym_preview_only_${id}` }, 201);
			}
			if (path.startsWith('/admin/api-keys/')) {
				const row = keys.find((k) => k.id === path.split('/')[3]);
				if (!row) return fail('密钥不存在', 404);
				if (path.endsWith('/revoke')) {
					row.revokedAt = Date.now();
					row.enabled = 0;
					return ok(true);
				}
				if (method === 'PUT') {
					const data = keyInput.parse(input);
					Object.assign(row, data, { enabled: Number(data.enabled) });
					return ok(true);
				}
			}
			if (path === '/admin/webhooks' && method === 'GET') return ok(endpoints);
			if (path === '/admin/webhooks' && method === 'POST') {
				const data = webhookInput.parse(input),
					id = crypto.randomUUID();
				endpoints.unshift({ ...data, id, enabled: Number(data.enabled), lastDelivery: null });
				return ok({ id, secret: `whsec_preview_only_${id}` }, 201);
			}
			if (path.startsWith('/admin/webhooks/')) {
				const row = endpoints.find((e) => e.id === path.split('/')[3]);
				if (!row) return fail('Webhook 不存在', 404);
				if (path.endsWith('/test')) {
					const id = crypto.randomUUID();
					deliveries.unshift({
						id,
						endpointId: row.id,
						endpointName: row.name,
						status: 'pending',
						attempts: 0,
						lastStatus: null,
						lastError: null,
						createdAt: Date.now(),
						payload: JSON.stringify({ eventId: id, event: 'email.received', test: true }),
					});
					row.lastDelivery = { status: 'pending', lastStatus: null };
					return ok({ eventId: id }, 201);
				}
				if (method === 'PUT') {
					const data = webhookInput.parse(input);
					Object.assign(row, data, { enabled: Number(data.enabled) });
					return ok(true);
				}
			}
			if (path === '/admin/webhook-deliveries') return ok(deliveries);
			if (path.startsWith('/admin/webhook-deliveries/')) {
				const row = deliveries.find((d) => d.id === decodeURIComponent(path.split('/')[3]));
				if (!row) return fail('投递不存在', 404);
				if (path.endsWith('/attempts'))
					return ok(
						Array.from({ length: row.attempts }, (_, i) => ({
							id: `${row.id}-${i + 1}`,
							attempt: i + 1,
							status: row.lastStatus,
							error: row.lastError,
							startedAt: row.createdAt + i * 1000,
							finishedAt: row.createdAt + i * 1000 + 250,
						})),
					);
				if (path.endsWith('/replay')) {
					row.status = 'pending';
					return ok(true);
				}
			}
			if (path === '/admin/api-call-logs') return ok(logs.filter((row) => !query.get('keyId') || row.apiKeyId === query.get('keyId')));
			return fail('本地演示不支持该操作', 404);
		} catch (e) {
			return fail(e instanceof Error ? e.message : '演示请求失败');
		}
	};
}
