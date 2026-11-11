import { externalAdmin } from './external-admin';
import { Hono } from 'hono';
import { eq, inArray } from 'drizzle-orm';
import { domainInput, grantInput, mailboxInput } from '../shared/contracts';
import { ApiError, chunks, db, id, ok, type AppEnv } from './core';
import { domains, mailboxes, users, grants } from './schema';
export const admin = new Hono<AppEnv>();
admin.use('*', async (c, next) => {
	if (!c.get('user').isAdmin) throw new ApiError(403, 'FORBIDDEN', '需要管理员权限');
	await next();
});
admin.get('/domains', async (c) => c.json(ok(await db(c.env).select().from(domains).orderBy(domains.name))));
admin.post('/domains', async (c) => {
	const body = domainInput.parse(await c.req.json());
	const row = await db(c.env)
		.insert(domains)
		.values({ id: id(), ...body, createdAt: Date.now() })
		.onConflictDoNothing()
		.returning()
		.get();
	if (!row) throw new ApiError(409, 'DOMAIN_EXISTS', '域名已存在');
	return c.json(ok(row), 201);
});
admin.patch('/domains/:id', async (c) => {
	const body = domainInput.pick({ enabled: true }).parse(await c.req.json());
	const row = await db(c.env)
		.update(domains)
		.set(body)
		.where(eq(domains.id, c.req.param('id')))
		.returning()
		.get();
	if (!row) throw new ApiError(404, 'NOT_FOUND', '域名不存在');
	return c.json(ok(row));
});
admin.get('/mailboxes', async (c) => c.json(ok(await db(c.env).select().from(mailboxes).orderBy(mailboxes.address))));
admin.post('/mailboxes', async (c) => {
	const body = mailboxInput.parse(await c.req.json());
	const domain = await db(c.env)
		.select()
		.from(domains)
		.where(eq(domains.name, body.address.split('@')[1]))
		.get();
	if (!domain) throw new ApiError(400, 'DOMAIN_REQUIRED', '请先添加对应域名');
	const row = await db(c.env)
		.insert(mailboxes)
		.values({ id: id(), domainId: domain.id, ...body, createdAt: Date.now() })
		.onConflictDoNothing()
		.returning()
		.get();
	if (!row) throw new ApiError(409, 'MAILBOX_EXISTS', '邮箱地址已存在');
	return c.json(ok(row), 201);
});
admin.patch('/mailboxes/:id', async (c) => {
	const body = mailboxInput.pick({ name: true, enabled: true }).parse(await c.req.json());
	const row = await db(c.env)
		.update(mailboxes)
		.set(body)
		.where(eq(mailboxes.id, c.req.param('id')))
		.returning()
		.get();
	if (!row) throw new ApiError(404, 'NOT_FOUND', '邮箱不存在');
	return c.json(ok(row));
});
admin.get('/accounts', async (c) => {
	const conn = db(c.env),
		accounts = await conn.select().from(users).orderBy(users.email),
		permissions = await conn.select().from(grants);
	return c.json(
		ok(
			accounts.map((u) => ({
				id: u.id,
				email: u.email,
				issuer: u.issuer,
				subject: u.subject,
				grants: permissions.filter((g) => g.userId === u.id).map(({ mailboxId, canRead, canSend }) => ({ mailboxId, canRead, canSend })),
			})),
		),
	);
});
admin.put('/accounts/grants', async (c) => {
	const body = grantInput.parse(await c.req.json()),
		conn = db(c.env);
	if (new Set(body.grants.map((g) => g.mailboxId)).size !== body.grants.length)
		throw new ApiError(400, 'DUPLICATE_MAILBOX', '邮箱授权重复');
	if (body.grants.length) {
		let count = 0;
		for (const group of chunks(
			body.grants.map((g) => g.mailboxId),
			100,
		))
			count += (await conn.select({ id: mailboxes.id }).from(mailboxes).where(inArray(mailboxes.id, group))).length;
		if (count !== body.grants.length) throw new ApiError(400, 'INVALID_MAILBOX', '包含不存在的邮箱');
	}
	await conn.insert(users).values({ id: id(), email: body.email, createdAt: Date.now() }).onConflictDoNothing();
	const user = await conn.select().from(users).where(eq(users.email, body.email)).get();
	if (!user) throw new ApiError(409, 'CONFLICT', '账号信息已变化，请刷新');
	const values = body.grants.filter((g) => g.canRead || g.canSend).map((g) => ({ id: id(), userId: user.id, ...g }));
	if (values.length)
		await conn.batch([
			conn.delete(grants).where(eq(grants.userId, user.id)),
			...chunks(values, 20).map((group) => conn.insert(grants).values(group)),
		]);
	else await conn.delete(grants).where(eq(grants.userId, user.id));
	return c.json(ok(true));
});

admin.route('/', externalAdmin);
