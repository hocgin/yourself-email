import { bodyLimit } from 'hono/body-limit';
import { Hono } from 'hono';
import { and, desc, eq, lt, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { ApiError, db, id, ok, sha, type AppEnv } from './core';
import { authenticateKey, consumeQuota, apiMailbox, scopesFor, type ApiMailbox } from './api-auth';
import { messages, attachments, apiSendRequests } from './schema';
import { openListInput, openSendInput, type OpenMailbox, type OpenMessage } from '../shared/open-contracts';
import { emailSchema, sendInput, type SendResult } from '../shared/contracts';
import { one, rows, stableJson, stmt } from './sql';
import { sendEmail } from './outbound';
import { publishedTemplate, renderTemplate } from './templates';
import { safeHtml, escapeHtml } from './content';
export const openApi = new Hono<AppEnv>();
openApi.use('*', async (c, next) => {
	const key = await authenticateKey(c.env, c.req.header('Authorization'));
	c.set('apiKey', key);
	const requestId = id(),
		start = Date.now();
	c.set('requestId', requestId);
	c.header('X-Request-Id', requestId);
	const retry = await consumeQuota(c.env, key);
	if (retry !== null) {
		c.header('Retry-After', String(retry));
		c.res = c.json({ error: { code: 'RATE_LIMITED', message: 'API 请求额度已用尽' } }, 429);
	} else await next();
	let errorCode: string | null = null;
	if (c.res.status >= 400) {
		try {
			errorCode = ((await c.res.clone().json()) as { error?: { code?: string } }).error?.code || 'REQUEST_FAILED';
		} catch {
			errorCode = 'REQUEST_FAILED';
		}
	}
	// Never log raw paths, query strings, tokens, bodies, or template variables.
	const path = c.req.path;
	const operation = path.includes('/messages/send')
		? 'messages.send'
		: path.includes('/attachments')
			? 'attachments.read'
			: path.includes('/messages')
				? 'messages.read'
				: 'mailboxes.read';
	try {
		await stmt(
			c.env,
			'INSERT INTO api_call_logs(id,apiKeyId,operation,mailbox,status,errorCode,duration,createdAt) VALUES(?,?,?,?,?,?,?,?)',
			requestId,
			key.id,
			`${c.req.method} ${operation}`,
			c.get('openMailbox') || null,
			c.res.status,
			errorCode,
			Date.now() - start,
			start,
		).run();
	} catch {
		console.error('api_audit_failed', { requestId });
	}
});
openApi.use(
	'*',
	bodyLimit({
		maxSize: 20 * 1024 * 1024,
		onError: () => {
			throw new ApiError(413, 'REQUEST_TOO_LARGE', '请求内容过大');
		},
	}),
);
function mailboxOutput(row: ApiMailbox): OpenMailbox {
	return { email: row.address, name: row.name, enabled: !!row.enabled, domainEnabled: !!row.domainEnabled, scopes: scopesFor(row) };
}
openApi.get('/mailboxes', async (c) =>
	c.json(
		ok(
			(
				await rows<ApiMailbox>(
					c.env,
					`SELECT m.id,m.address,m.name,m.enabled,d.enabled AS domainEnabled,g.canRead,g.canSend,g.canReadAttachments
 FROM api_key_mailboxes g JOIN mailboxes m ON m.id=g.mailboxId JOIN domains d ON d.id=m.domainId
 WHERE g.apiKeyId=? AND (g.canRead=1 OR g.canSend=1) ORDER BY m.address`,
					c.get('apiKey').id,
				)
			).map(mailboxOutput),
		),
	),
);
openApi.get('/mailboxes/:email', async (c) => {
	const email = emailSchema.parse(c.req.param('email'));
	c.set('openMailbox', email);
	const row = await one<ApiMailbox>(
		c.env,
		`SELECT m.id,m.address,m.name,m.enabled,d.enabled AS domainEnabled,g.canRead,g.canSend,g.canReadAttachments
 FROM api_key_mailboxes g JOIN mailboxes m ON m.id=g.mailboxId JOIN domains d ON d.id=m.domainId
 WHERE g.apiKeyId=? AND m.address=? AND (g.canRead=1 OR g.canSend=1)`,
		c.get('apiKey').id,
		email,
	);
	return c.json(ok(mailboxOutput(row)));
});
export function externalMessage(row: typeof messages.$inferSelect, email: string): OpenMessage {
	return {
		id: row.id,
		mailbox: email,
		from: row.from,
		to: row.to,
		cc: row.cc,
		replyTo: row.replyTo,
		subject: row.subject,
		snippet: row.snippet,
		date: row.date,
		messageId: row.messageId,
		isRead: row.isRead,
		isArchive: row.isArchive,
		isTrash: row.isTrash,
		hasAttachments: row.hasAttachments,
	};
}
openApi.get('/mailboxes/:email/messages', async (c) => {
	const box = await apiMailbox(c.env, c.get('apiKey').id, c.req.param('email'), 'mail:read');
	c.set('openMailbox', box.address);
	const query = openListInput.parse(c.req.query());
	const conditions = [eq(messages.mailboxId, box.id), eq(messages.direction, 'inbound'), eq(messages.isTrash, query.folder === 'trash')];
	if (query.folder !== 'trash') conditions.push(eq(messages.isArchive, query.folder === 'archive'));
	if (query.unread) conditions.push(eq(messages.isRead, query.unread === 'false'));
	if (query.from) conditions.push(sql`json_extract(${messages.from}, '$.email') = ${query.from}`);
	if (query.since) conditions.push(sql`${messages.date} >= ${Date.parse(query.since)}`);
	if (query.until) conditions.push(sql`${messages.date} <= ${Date.parse(query.until)}`);
	if (query.q) conditions.push(sql`(${messages.subject} like ${`%${query.q}%`} OR ${messages.snippet} like ${`%${query.q}%`})`);
	if (query.cursor) {
		let cursor;
		try {
			cursor = z
				.object({ date: z.number().finite(), id: z.string().min(1), mailbox: z.literal(box.address), filter: z.string() })
				.parse(JSON.parse(atob(query.cursor)));
		} catch {
			throw new ApiError(400, 'INVALID_CURSOR', '分页游标无效');
		}
		const filter = await sha(stableJson({ ...query, cursor: undefined, limit: undefined }));
		if (cursor.filter !== filter) throw new ApiError(400, 'INVALID_CURSOR', '分页筛选条件不匹配');
		conditions.push(or(lt(messages.date, cursor.date), and(eq(messages.date, cursor.date), lt(messages.id, cursor.id)))!);
	}
	const found = await db(c.env)
		.select()
		.from(messages)
		.where(and(...conditions))
		.orderBy(desc(messages.date), desc(messages.id))
		.limit(query.limit + 1);
	const items = found.slice(0, query.limit),
		last = items.at(-1);
	const nextCursor =
		found.length > query.limit && last
			? btoa(
					JSON.stringify({
						date: last.date,
						id: last.id,
						mailbox: box.address,
						filter: await sha(stableJson({ ...query, cursor: undefined, limit: undefined })),
					}),
				)
			: null;
	return c.json(ok({ items: items.map((r) => externalMessage(r, box.address)), nextCursor }));
});
async function inboundMessage(env: AppEnv['Bindings'], mailboxId: string, messageId: string) {
	const row = await db(env)
		.select()
		.from(messages)
		.where(and(eq(messages.id, messageId), eq(messages.mailboxId, mailboxId), eq(messages.direction, 'inbound')))
		.get();
	if (!row) throw new ApiError(404, 'NOT_FOUND', '邮件不存在或无权访问');
	return row;
}
async function fileMetadata(env: AppEnv['Bindings'], mailboxId: string, messageId: string) {
	return db(env)
		.select({
			id: attachments.id,
			filename: attachments.filename,
			type: attachments.type,
			size: attachments.size,
			contentId: attachments.contentId,
			disposition: attachments.disposition,
		})
		.from(attachments)
		.where(and(eq(attachments.mailboxId, mailboxId), eq(attachments.messageId, messageId)));
}
openApi.get('/mailboxes/:email/messages/:messageId', async (c) => {
	const box = await apiMailbox(c.env, c.get('apiKey').id, c.req.param('email'), 'mail:read');
	c.set('openMailbox', box.address);
	const row = await inboundMessage(c.env, box.id, c.req.param('messageId'));
	const body = await c.env.MAIL_STORAGE.get(row.bodyKey);
	if (!body) throw new ApiError(503, 'BODY_UNAVAILABLE', '邮件正文暂不可用');
	const content = await body.json<{ html: string; text: string }>();
	return c.json(
		ok({
			...externalMessage(row, box.address),
			html: safeHtml(content.html || `<pre>${escapeHtml(content.text)}</pre>`),
			text: content.text,
			...(box.canReadAttachments ? { attachments: await fileMetadata(c.env, box.id, row.id) } : {}),
		}),
	);
});
openApi.get('/mailboxes/:email/messages/:messageId/attachments', async (c) => {
	const box = await apiMailbox(c.env, c.get('apiKey').id, c.req.param('email'), 'attachment:read');
	c.set('openMailbox', box.address);
	await inboundMessage(c.env, box.id, c.req.param('messageId'));
	return c.json(ok(await fileMetadata(c.env, box.id, c.req.param('messageId'))));
});
openApi.get('/mailboxes/:email/messages/:messageId/attachments/:attachmentId', async (c) => {
	const box = await apiMailbox(c.env, c.get('apiKey').id, c.req.param('email'), 'attachment:read');
	c.set('openMailbox', box.address);
	await inboundMessage(c.env, box.id, c.req.param('messageId'));
	const row = await db(c.env)
		.select()
		.from(attachments)
		.where(
			and(
				eq(attachments.id, c.req.param('attachmentId')),
				eq(attachments.messageId, c.req.param('messageId')),
				eq(attachments.mailboxId, box.id),
			),
		)
		.get();
	if (!row) throw new ApiError(404, 'NOT_FOUND', '附件不存在或无权访问');
	const object = await c.env.MAIL_STORAGE.get(row.key);
	if (!object) throw new ApiError(404, 'NOT_FOUND', '附件内容不存在');
	c.header('Content-Type', row.type);
	c.header('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(row.filename)}`);
	c.header('Content-Security-Policy', "default-src 'none'; sandbox");
	c.header('Content-Length', String(row.size));
	return c.body(object.body);
});
export async function apiSendStatus(
	env: AppEnv['Bindings'],
	keyId: string,
	selector: { key: string; fingerprint: string } | { id: string },
	onMailbox?: (email: string) => void,
): Promise<SendResult | null> {
	const conn = db(env);
	const row = await conn
		.select({ request: apiSendRequests, message: messages })
		.from(apiSendRequests)
		.innerJoin(messages, eq(messages.id, apiSendRequests.id))
		.where(
			and(
				eq(apiSendRequests.apiKeyId, keyId),
				'key' in selector ? eq(apiSendRequests.key, selector.key) : eq(apiSendRequests.id, selector.id),
			),
		)
		.get();
	if (!row) return null;
	const box = await one<{ address: string }>(env, 'SELECT address FROM mailboxes WHERE id=?', row.message.mailboxId);
	await apiMailbox(env, keyId, box.address, 'mail:send');
	onMailbox?.(box.address);
	if ('fingerprint' in selector && row.request.fingerprint !== selector.fingerprint)
		throw new ApiError(409, 'IDEMPOTENCY_CONFLICT', '同一发送键不能用于不同邮件');
	const stale = row.message.sendState === 'pending' && row.request.createdAt < Date.now() - 120000;
	if (stale)
		await conn
			.update(messages)
			.set({ sendState: 'unknown', errorCode: 'SEND_INTERRUPTED' })
			.where(and(eq(messages.id, row.message.id), eq(messages.sendState, 'pending')));
	return {
		id: row.message.id,
		status: stale ? 'unknown' : row.message.sendState!,
		messageId: row.message.messageId,
		errorCode: stale ? 'SEND_INTERRUPTED' : row.message.errorCode,
	};
}
openApi.post('/messages/send', async (c) => {
	const input = openSendInput.parse(await c.req.json()),
		key = z.string().uuid().parse(c.req.header('Idempotency-Key'));
	const keyId = c.get('apiKey').id,
		box = await apiMailbox(c.env, keyId, input.from, 'mail:send');
	c.set('openMailbox', box.address);
	const fingerprint = await sha(stableJson(input));
	const existing = await apiSendStatus(c.env, keyId, { key, fingerprint });
	if (existing) return c.json(ok(existing));
	let content,
		metadata: { fingerprint: string; templateCode?: string; templateVersionId?: string } = { fingerprint };
	if ('templateCode' in input) {
		const t = await publishedTemplate(c.env, input.templateCode, box.address);
		content = renderTemplate(t.content, input.variables);
		metadata = { fingerprint, templateCode: t.template.code, templateVersionId: t.version.id };
	} else content = { subject: input.subject, text: input.text, html: input.html };
	return c.json(
		ok(
			await sendEmail(
				c.env,
				{ kind: 'apiKey', id: keyId },
				sendInput.parse({ ...content, mailboxId: box.id, to: input.to, cc: input.cc, bcc: input.bcc }),
				key,
				metadata,
			),
		),
	);
});
openApi.get('/messages/send/:id', async (c) => {
	const result = await apiSendStatus(c.env, c.get('apiKey').id, { id: c.req.param('id') }, (email) => c.set('openMailbox', email));
	if (!result) throw new ApiError(404, 'NOT_FOUND', '发送请求不存在或无权访问');
	return c.json(ok(result));
});
openApi.all('*', () => {
	throw new ApiError(404, 'NOT_FOUND', '接口不存在');
});
