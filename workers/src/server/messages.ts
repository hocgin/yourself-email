import { Hono } from 'hono';
import { and, desc, eq, lt, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { ApiError, db, id, MAX_UPLOAD, ok, type AppEnv, type Ctx } from './core';
import { attachments, messages, sendRequests } from './schema';
import { mailboxAccess, messageAccess } from './permissions';
import { folderSchema, sendInput, statusInput, type Message, type MessageDetail } from '../shared/contracts';
import { sendEmail } from './outbound';
import { safeHtml } from './content';
const listInput = z.object({
	mailboxId: z.string().min(1),
	folder: folderSchema.default('inbox'),
	q: z.string().max(200).default(''),
	cursor: z.string().max(1024).optional(),
	unread: z.enum(['true', 'false']).default('false'),
});
const cursorShape = z.object({ date: z.number().finite(), id: z.string().min(1) });
export function publicMessage(row: typeof messages.$inferSelect): Message {
	const { bodyKey, rawKey, dedupKey, createdAt, ...message } = row;
	return message;
}
function cursorFilter(cursor: string | undefined) {
	if (!cursor) return undefined;
	let value;
	try {
		value = cursorShape.parse(JSON.parse(atob(cursor)));
	} catch {
		throw new ApiError(400, 'INVALID_CURSOR', '分页游标无效');
	}
	return or(lt(messages.date, value.date), and(eq(messages.date, value.date), lt(messages.id, value.id)));
}
async function page(c: Ctx, conditions: ReturnType<typeof eq>[]) {
	const cursor = c.req.query('cursor'),
		rows = await db(c.env)
			.select()
			.from(messages)
			.where(and(...conditions, cursorFilter(cursor)))
			.orderBy(desc(messages.date), desc(messages.id))
			.limit(31),
		items = rows.slice(0, 30);
	const last = items.at(-1);
	return c.json(
		ok({
			items: items.map(publicMessage),
			nextCursor: rows.length > 30 && last ? btoa(JSON.stringify({ date: last.date, id: last.id })) : null,
		}),
	);
}
export const mailRoutes = new Hono<AppEnv>();
mailRoutes.get('/', async (c) => {
	const query = listInput.parse(c.req.query());
	await mailboxAccess(c.env, c.get('user'), query.mailboxId, 'read');
	const conditions = [eq(messages.mailboxId, query.mailboxId), eq(messages.isTrash, query.folder === 'trash')];
	if (query.folder === 'inbox') conditions.push(eq(messages.direction, 'inbound'), eq(messages.isArchive, false));
	if (query.folder === 'sent') conditions.push(eq(messages.direction, 'outbound'), eq(messages.isArchive, false));
	if (query.folder === 'archive') conditions.push(eq(messages.isArchive, true));
	if (query.unread === 'true') conditions.push(eq(messages.isRead, false));
	if (query.q)
		conditions.push(
			sql`(${messages.subject} like ${`%${query.q}%`} OR ${messages.snippet} like ${`%${query.q}%`} OR ${messages.from} like ${`%${query.q}%`} OR ${messages.to} like ${`%${query.q}%`})`,
		);
	return page(c, conditions);
});
mailRoutes.post('/send', async (c) => {
	const input = sendInput.parse(await c.req.json()),
		key = z.string().uuid().parse(c.req.header('Idempotency-Key'));
	return c.json(ok(await sendEmail(c.env, c.get('user'), input, key)));
});
mailRoutes.get('/send/:id', async (c) => {
	const row = await db(c.env)
		.select({ request: sendRequests, message: messages })
		.from(sendRequests)
		.innerJoin(messages, eq(messages.id, sendRequests.id))
		.where(and(eq(sendRequests.id, c.req.param('id')), eq(sendRequests.userId, c.get('user').id)))
		.get();
	if (!row) throw new ApiError(404, 'NOT_FOUND', '发送请求不存在');
	await mailboxAccess(c.env, c.get('user'), row.message.mailboxId, 'send');
	const stale = row.message.sendState === 'pending' && row.request.createdAt < Date.now() - 120_000;
	if (stale)
		await db(c.env)
			.update(messages)
			.set({ sendState: 'unknown', errorCode: 'SEND_INTERRUPTED' })
			.where(and(eq(messages.id, row.message.id), eq(messages.sendState, 'pending')));
	return c.json(
		ok({
			id: row.message.id,
			status: stale ? 'unknown' : row.message.sendState,
			messageId: row.message.messageId,
			errorCode: stale ? 'SEND_INTERRUPTED' : row.message.errorCode,
		}),
	);
});
mailRoutes.get('/:id/history', async (c) => {
	const row = await messageAccess(c.env, c.get('user'), c.req.param('id'));
	const peer = row.direction === 'inbound' ? row.from.email : row.to[0]?.email;
	const conditions = [eq(messages.mailboxId, row.mailboxId)];
	if (peer)
		conditions.push(
			sql`(json_extract(${messages.from}, '$.email') = ${peer} OR EXISTS (SELECT 1 FROM json_each(${messages.to}) WHERE json_extract(value, '$.email') = ${peer}) OR EXISTS (SELECT 1 FROM json_each(${messages.cc}) WHERE json_extract(value, '$.email') = ${peer}))`,
		);
	else conditions.push(eq(messages.id, row.id));
	return page(c, conditions);
});
mailRoutes.get('/:id', async (c) => {
	const row = await messageAccess(c.env, c.get('user'), c.req.param('id'));
	const body = await c.env.MAIL_STORAGE.get(row.bodyKey);
	if (!body && row.sendState !== 'failed') throw new ApiError(503, 'BODY_UNAVAILABLE', '邮件正文暂不可用');
	const content = body ? await body.json<{ html: string; text: string }>() : { html: '', text: row.snippet };
	const files = await db(c.env)
		.select({
			id: attachments.id,
			filename: attachments.filename,
			type: attachments.type,
			size: attachments.size,
			contentId: attachments.contentId,
			disposition: attachments.disposition,
		})
		.from(attachments)
		.where(eq(attachments.messageId, row.id));
	const detail: MessageDetail = {
		...publicMessage(row),
		html: safeHtml(content.html || `<pre>${escapeText(content.text || '')}</pre>`),
		text: content.text,
		attachments: files,
	};
	return c.json(ok(detail));
});
function escapeText(s: string) {
	return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);
}
mailRoutes.patch('/:id', async (c) => {
	const row = await messageAccess(c.env, c.get('user'), c.req.param('id'));
	const input = statusInput.parse(await c.req.json());
	await db(c.env).update(messages).set(input).where(eq(messages.id, row.id));
	return c.json(ok(true));
});
export const fileRoutes = new Hono<AppEnv>();
fileRoutes.post('/', async (c) => {
	const form = await c.req.formData(),
		mailboxId = z.string().min(1).parse(form.get('mailboxId')),
		file = form.get('file');
	await mailboxAccess(c.env, c.get('user'), mailboxId, 'send');
	if (!file || typeof file === 'string') throw new ApiError(400, 'FILE_REQUIRED', '请选择附件');
	if (file.size > MAX_UPLOAD) throw new ApiError(413, 'FILE_TOO_LARGE', '单个附件不能超过 18 MiB');
	const aid = id(),
		key = `uploads/${c.get('user').id}/${aid}`;
	const row = {
		id: aid,
		mailboxId,
		userId: c.get('user').id,
		key,
		filename: file.name.replace(/[\r\n\\/]/g, '_').slice(0, 255) || 'attachment',
		type: file.type || 'application/octet-stream',
		size: file.size,
		disposition: 'attachment',
		createdAt: Date.now(),
	};
	await c.env.MAIL_STORAGE.put(key, file.stream());
	try {
		await db(c.env).insert(attachments).values(row);
	} catch (error) {
		await c.env.MAIL_STORAGE.delete(key);
		throw error;
	}
	return c.json(ok({ id: aid, filename: row.filename, type: row.type, size: row.size, contentId: null, disposition: 'attachment' }), 201);
});
fileRoutes.get('/:id', async (c) => {
	const row = await db(c.env)
		.select()
		.from(attachments)
		.where(eq(attachments.id, c.req.param('id')))
		.get();
	if (!row) throw new ApiError(404, 'NOT_FOUND', '附件不存在');
	if (row.messageId) await messageAccess(c.env, c.get('user'), row.messageId);
	else {
		if (row.userId !== c.get('user').id || row.createdAt < Date.now() - 86_400_000) throw new ApiError(404, 'NOT_FOUND', '附件不存在');
		await mailboxAccess(c.env, c.get('user'), row.mailboxId, 'send');
	}
	const object = await c.env.MAIL_STORAGE.get(row.key);
	if (!object) throw new ApiError(404, 'NOT_FOUND', '附件内容不存在');
	c.header('Content-Type', row.type);
	c.header('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(row.filename)}`);
	c.header('Content-Length', String(row.size));
	c.header('Content-Security-Policy', "default-src 'none'; sandbox");
	return c.body(object.body);
});
