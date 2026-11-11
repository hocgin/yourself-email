import { Hono } from 'hono';
import { z } from 'zod';
import { ApiError, id, ok, sha, type AppEnv, type Bindings } from './core';
import { keyInput, templateInput, templateContent, variablesSchema, webhookInput } from '../shared/open-contracts';
import { emailSchema, sendInput } from '../shared/contracts';
import { newSecret, resolveAddresses, scopesFor, type ApiKeyRow, type ApiMailbox } from './api-auth';
import { stmt, rows, one } from './sql';
import { renderTemplate, validateTemplate, type TemplateRow } from './templates';
import { safeHtml } from './content';
import { sendEmail } from './outbound';
import { encryptSecret, validateWebhookTarget } from './webhook-security';
import { enqueueDue, type ReceivedEvent } from './webhooks';
export const externalAdmin = new Hono<AppEnv>();
// Mounted behind the existing SSO admin guard; keys can never reach these routes.
function audit(env: Bindings, userId: string, action: string, resourceId: string) {
	return stmt(
		env,
		'INSERT INTO admin_audit_logs(id,userId,action,resourceId,createdAt) VALUES(?,?,?,?,?)',
		id(),
		userId,
		action,
		resourceId,
		Date.now(),
	);
}
async function keyList(env: Bindings) {
	const keys = await rows<ApiKeyRow>(
		env,
		`SELECT id,name,prefix,enabled,revokedAt,expiresAt,minuteLimit,dayLimit,minuteWindow,dayWindow,minuteCount,dayCount,createdAt,lastUsedAt FROM api_keys ORDER BY createdAt DESC`,
	);
	const grants = await rows<ApiMailbox & { apiKeyId: string }>(
		env,
		'SELECT g.apiKeyId,m.address,g.canRead,g.canSend,g.canReadAttachments FROM api_key_mailboxes g JOIN mailboxes m ON m.id=g.mailboxId',
	);
	return keys.map((k) => ({
		...k,
		mailboxes: grants.filter((g) => g.apiKeyId === k.id).map((g) => ({ email: g.address, scopes: scopesFor(g) })),
	}));
}
externalAdmin.get('/api-keys', async (c) => c.json(ok(await keyList(c.env))));
externalAdmin.post('/api-keys', async (c) => {
	const body = keyInput.parse(await c.req.json());
	if (body.expiresAt !== null && body.expiresAt <= Date.now()) throw new ApiError(400, 'INVALID_EXPIRY', '有效期必须晚于当前时间');
	const mailboxIds = await resolveAddresses(
			c.env,
			body.mailboxes.map((g) => g.email),
		),
		keyId = id(),
		secret = newSecret();
	await c.env.DB.batch([
		stmt(
			c.env,
			'INSERT INTO api_keys(id,name,prefix,hash,enabled,expiresAt,minuteLimit,dayLimit,createdAt) VALUES(?,?,?,?,?,?,?,?,?)',
			keyId,
			body.name,
			secret.slice(0, 11),
			await sha(secret),
			+body.enabled,
			body.expiresAt,
			body.minuteLimit,
			body.dayLimit,
			Date.now(),
		),
		...body.mailboxes.map((g, i) =>
			stmt(
				c.env,
				'INSERT INTO api_key_mailboxes(apiKeyId,mailboxId,canSend,canRead,canReadAttachments) VALUES(?,?,?,?,?)',
				keyId,
				mailboxIds[i],
				+g.scopes.includes('mail:send'),
				+g.scopes.includes('mail:read'),
				+g.scopes.includes('attachment:read'),
			),
		),
		audit(c.env, c.get('user').id, 'api_key.create', keyId),
	]);
	return c.json(ok({ ...(await keyList(c.env)).find((k) => k.id === keyId)!, secret }), 201);
});
externalAdmin.put('/api-keys/:id', async (c) => {
	const body = keyInput.parse(await c.req.json()),
		keyId = c.req.param('id');
	await one(c.env, 'SELECT id FROM api_keys WHERE id=? AND revokedAt IS NULL', keyId);
	if (body.expiresAt !== null && body.expiresAt <= Date.now()) throw new ApiError(400, 'INVALID_EXPIRY', '有效期必须晚于当前时间');
	const mailboxIds = await resolveAddresses(
		c.env,
		body.mailboxes.map((g) => g.email),
	);
	await c.env.DB.batch([
		stmt(
			c.env,
			'UPDATE api_keys SET name=?,enabled=?,expiresAt=?,minuteLimit=?,dayLimit=? WHERE id=?',
			body.name,
			+body.enabled,
			body.expiresAt,
			body.minuteLimit,
			body.dayLimit,
			keyId,
		),
		stmt(c.env, 'DELETE FROM api_key_mailboxes WHERE apiKeyId=?', keyId),
		...body.mailboxes.map((g, i) =>
			stmt(
				c.env,
				'INSERT INTO api_key_mailboxes(apiKeyId,mailboxId,canSend,canRead,canReadAttachments) VALUES(?,?,?,?,?)',
				keyId,
				mailboxIds[i],
				+g.scopes.includes('mail:send'),
				+g.scopes.includes('mail:read'),
				+g.scopes.includes('attachment:read'),
			),
		),
		audit(c.env, c.get('user').id, 'api_key.update', keyId),
	]);
	return c.json(ok(true));
});
externalAdmin.post('/api-keys/:id/revoke', async (c) => {
	const keyId = c.req.param('id');
	await one(c.env, 'SELECT id FROM api_keys WHERE id=?', keyId);
	await c.env.DB.batch([
		stmt(c.env, 'UPDATE api_keys SET enabled=0,revokedAt=COALESCE(revokedAt,?) WHERE id=?', Date.now(), keyId),
		audit(c.env, c.get('user').id, 'api_key.revoke', keyId),
	]);
	return c.json(ok(true));
});
const logQuery = z.object({ before: z.coerce.number().int().positive().optional(), keyId: z.string().max(100).optional() });
externalAdmin.get('/api-call-logs', async (c) => {
	const q = logQuery.parse(c.req.query());
	return c.json(
		ok(
			await rows(
				c.env,
				`SELECT l.*,k.name AS keyName,k.prefix FROM api_call_logs l JOIN api_keys k ON k.id=l.apiKeyId
 WHERE l.createdAt<? ${q.keyId ? 'AND l.apiKeyId=?' : ''} ORDER BY l.createdAt DESC,l.id DESC LIMIT 100`,
				q.before ?? Date.now() + 1,
				...(q.keyId ? [q.keyId] : []),
			),
		),
	);
});
externalAdmin.get('/audit-logs', async (c) =>
	c.json(ok(await rows(c.env, 'SELECT id,userId,action,resourceId,createdAt FROM admin_audit_logs ORDER BY createdAt DESC LIMIT 100'))),
);
async function templateList(env: Bindings) {
	return (await rows<TemplateRow>(env, 'SELECT * FROM email_templates ORDER BY updatedAt DESC')).map((t) => ({
		...t,
		mailboxes: JSON.parse(t.mailboxes) as string[],
	}));
}
externalAdmin.get('/templates', async (c) => c.json(ok(await templateList(c.env))));
externalAdmin.get('/templates/:id', async (c) => {
	const t = await one<TemplateRow>(c.env, 'SELECT * FROM email_templates WHERE id=?', c.req.param('id'));
	const versions = await rows<{ id: string; content: string; createdAt: number }>(
		c.env,
		'SELECT id,content,createdAt FROM email_template_versions WHERE templateId=? ORDER BY createdAt DESC',
		t.id,
	);
	return c.json(
		ok({ ...t, mailboxes: JSON.parse(t.mailboxes) as string[], versions: versions.map((v) => ({ ...v, content: JSON.parse(v.content) })) }),
	);
});
externalAdmin.post('/templates', async (c) => {
	const body = templateInput.parse(await c.req.json());
	validateTemplate(body.content);
	await resolveAddresses(c.env, body.mailboxes);
	if (await stmt(c.env, 'SELECT id FROM email_templates WHERE code=?', body.code).first())
		throw new ApiError(409, 'TEMPLATE_EXISTS', '模板编码已存在');
	const templateId = id(),
		versionId = id(),
		now = Date.now();
	await c.env.DB.batch([
		stmt(
			c.env,
			'INSERT INTO email_templates(id,code,name,description,enabled,mailboxes,draftVersionId,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?)',
			templateId,
			body.code,
			body.name,
			body.description,
			+body.enabled,
			JSON.stringify(body.mailboxes),
			versionId,
			now,
			now,
		),
		stmt(
			c.env,
			'INSERT INTO email_template_versions(id,templateId,content,createdAt) VALUES(?,?,?,?)',
			versionId,
			templateId,
			JSON.stringify(body.content),
			now,
		),
		audit(c.env, c.get('user').id, 'template.create', templateId),
	]);
	return c.json(ok({ id: templateId, draftVersionId: versionId }), 201);
});
externalAdmin.put('/templates/:id', async (c) => {
	const body = templateInput.parse(await c.req.json()),
		templateId = c.req.param('id');
	const existing = await one<TemplateRow>(c.env, 'SELECT * FROM email_templates WHERE id=?', templateId);
	if (existing.code !== body.code) throw new ApiError(400, 'IMMUTABLE_CODE', '模板编码创建后不可修改');
	validateTemplate(body.content);
	await resolveAddresses(c.env, body.mailboxes);
	const versionId = id(),
		now = Date.now();
	await c.env.DB.batch([
		stmt(
			c.env,
			'INSERT INTO email_template_versions(id,templateId,content,createdAt) VALUES(?,?,?,?)',
			versionId,
			templateId,
			JSON.stringify(body.content),
			now,
		),
		stmt(
			c.env,
			'UPDATE email_templates SET name=?,description=?,enabled=?,mailboxes=?,draftVersionId=?,updatedAt=? WHERE id=?',
			body.name,
			body.description,
			+body.enabled,
			JSON.stringify(body.mailboxes),
			versionId,
			now,
			templateId,
		),
		audit(c.env, c.get('user').id, body.enabled ? 'template.draft.save' : 'template.disable', templateId),
	]);
	return c.json(ok({ id: templateId, draftVersionId: versionId }));
});
externalAdmin.post('/templates/:id/publish', async (c) => {
	const { versionId } = z
			.object({ versionId: z.string().uuid() })
			.strict()
			.parse(await c.req.json()),
		templateId = c.req.param('id');
	const row = await one<{ content: string }>(
		c.env,
		'SELECT v.content FROM email_template_versions v JOIN email_templates t ON t.id=v.templateId WHERE t.id=? AND v.id=? AND t.draftVersionId=?',
		templateId,
		versionId,
		versionId,
	);
	validateTemplate(templateContent.parse(JSON.parse(row.content)));
	const result = await c.env.DB.batch([
		stmt(
			c.env,
			'UPDATE email_templates SET publishedVersionId=?,updatedAt=? WHERE id=? AND draftVersionId=? RETURNING id',
			versionId,
			Date.now(),
			templateId,
			versionId,
		),
		stmt(
			c.env,
			`INSERT INTO admin_audit_logs(id,userId,action,resourceId,createdAt) SELECT ?,?,'template.publish',?,? WHERE EXISTS(SELECT 1 FROM email_templates WHERE id=? AND publishedVersionId=?)`,
			id(),
			c.get('user').id,
			templateId,
			Date.now(),
			templateId,
			versionId,
		),
	]);
	if (!result[0].results.length) throw new ApiError(409, 'DRAFT_CHANGED', '草稿已变化，请刷新后发布');
	return c.json(ok(true));
});
externalAdmin.post('/templates/preview', async (c) => {
	const body = z
		.object({ content: templateContent, variables: variablesSchema.default({}) })
		.strict()
		.parse(await c.req.json());
	const rendered = renderTemplate(body.content, body.variables, true);
	return c.json(ok({ ...rendered, html: safeHtml(rendered.html) }));
});
externalAdmin.post('/templates/:id/test', async (c) => {
	const body = z
		.object({ from: emailSchema, to: emailSchema, variables: variablesSchema.default({}) })
		.strict()
		.parse(await c.req.json());
	const t = await one<TemplateRow>(c.env, 'SELECT * FROM email_templates WHERE id=?', c.req.param('id'));
	const allowed = JSON.parse(t.mailboxes) as string[];
	if (allowed.length && !allowed.includes(body.from)) throw new ApiError(400, 'TEMPLATE_MAILBOX', '该邮箱不在模板范围内');
	const version = await one<{ content: string }>(c.env, 'SELECT content FROM email_template_versions WHERE id=?', t.draftVersionId);
	const content = renderTemplate(templateContent.parse(JSON.parse(version.content)), body.variables, true);
	const box = await one<{ id: string }>(c.env, 'SELECT id FROM mailboxes WHERE address=?', body.from);
	const result = await sendEmail(
		c.env,
		c.get('user'),
		sendInput.parse({ ...content, mailboxId: box.id, to: [{ email: body.to }] }),
		z.string().uuid().parse(c.req.header('Idempotency-Key')),
	);
	await audit(c.env, c.get('user').id, 'template.test', t.id).run();
	return c.json(ok(result));
});
interface Endpoint {
	id: string;
	name: string;
	url: string;
	enabled: number;
	createdAt: number;
}
externalAdmin.get('/webhooks', async (c) => {
	const endpoints = await rows<Endpoint>(c.env, 'SELECT id,name,url,enabled,createdAt FROM webhook_endpoints ORDER BY createdAt DESC');
	const bindings = await rows<{ endpointId: string; address: string }>(
		c.env,
		'SELECT b.endpointId,m.address FROM webhook_mailboxes b JOIN mailboxes m ON m.id=b.mailboxId',
	);
	const recent = await rows<{ endpointId: string; status: string; createdAt: number; lastStatus: number | null; lastError: string | null }>(
		c.env,
		'SELECT endpointId,status,createdAt,lastStatus,lastError FROM webhook_deliveries ORDER BY createdAt DESC LIMIT 500',
	);
	return c.json(
		ok(
			endpoints.map((e) => ({
				...e,
				mailboxes: bindings.filter((b) => b.endpointId === e.id).map((b) => b.address),
				lastDelivery: recent.find((r) => r.endpointId === e.id) || null,
			})),
		),
	);
});
externalAdmin.post('/webhooks', async (c) => {
	const body = webhookInput.parse(await c.req.json());
	await validateWebhookTarget(body.url);
	const mailboxIds = await resolveAddresses(c.env, body.mailboxes),
		endpointId = id(),
		secret = newSecret();
	const encrypted = await encryptSecret(c.env, secret);
	await c.env.DB.batch([
		stmt(
			c.env,
			'INSERT INTO webhook_endpoints(id,name,url,enabled,encryptedSecret,createdAt) VALUES(?,?,?,?,?,?)',
			endpointId,
			body.name,
			body.url,
			+body.enabled,
			encrypted,
			Date.now(),
		),
		...mailboxIds.map((mid) => stmt(c.env, 'INSERT INTO webhook_mailboxes(endpointId,mailboxId) VALUES(?,?)', endpointId, mid)),
		audit(c.env, c.get('user').id, 'webhook.create', endpointId),
	]);
	return c.json(ok({ id: endpointId, secret }), 201);
});
externalAdmin.put('/webhooks/:id', async (c) => {
	const body = webhookInput.parse(await c.req.json()),
		endpointId = c.req.param('id');
	await one(c.env, 'SELECT id FROM webhook_endpoints WHERE id=?', endpointId);
	await validateWebhookTarget(body.url);
	const mailboxIds = await resolveAddresses(c.env, body.mailboxes);
	await c.env.DB.batch([
		stmt(c.env, 'UPDATE webhook_endpoints SET name=?,url=?,enabled=? WHERE id=?', body.name, body.url, +body.enabled, endpointId),
		stmt(c.env, 'DELETE FROM webhook_mailboxes WHERE endpointId=?', endpointId),
		...mailboxIds.map((mid) => stmt(c.env, 'INSERT INTO webhook_mailboxes(endpointId,mailboxId) VALUES(?,?)', endpointId, mid)),
		...(!body.enabled
			? [
					stmt(
						c.env,
						"UPDATE webhook_deliveries SET status='cancelled',lastError='ENDPOINT_DISABLED' WHERE endpointId=? AND status='pending'",
						endpointId,
					),
				]
			: []),
		audit(c.env, c.get('user').id, 'webhook.update', endpointId),
	]);
	return c.json(ok(true));
});
externalAdmin.get('/webhook-deliveries', async (c) => {
	const query = z.object({ endpointId: z.string().max(100).optional(), before: z.coerce.number().int().optional() }).parse(c.req.query());
	const deliveries = await rows<{ id: string }>(
		c.env,
		`SELECT d.*,e.payload,w.name AS endpointName FROM webhook_deliveries d JOIN webhook_events e ON e.id=d.eventId JOIN webhook_endpoints w ON w.id=d.endpointId WHERE d.createdAt<? ${query.endpointId ? 'AND d.endpointId=?' : ''} ORDER BY d.createdAt DESC,d.id DESC LIMIT 100`,
		query.before ?? Date.now() + 1,
		...(query.endpointId ? [query.endpointId] : []),
	);
	return c.json(ok(deliveries));
});
externalAdmin.get('/webhook-deliveries/:id/attempts', async (c) => {
	await one(c.env, 'SELECT id FROM webhook_deliveries WHERE id=?', c.req.param('id'));
	return c.json(ok(await rows(c.env, 'SELECT * FROM webhook_attempts WHERE deliveryId=? ORDER BY attempt', c.req.param('id'))));
});
externalAdmin.post('/webhook-deliveries/:id/replay', async (c) => {
	const deliveryId = c.req.param('id');
	const result = await c.env.DB.batch([
		stmt(
			c.env,
			`UPDATE webhook_deliveries SET status='pending',cycleAttempts=0,nextAttemptAt=?,leaseToken=NULL,leaseUntil=NULL WHERE id=? AND status IN ('failed','cancelled') AND EXISTS(SELECT 1 FROM webhook_endpoints WHERE id=endpointId AND enabled=1) RETURNING id`,
			Date.now(),
			deliveryId,
		),
		audit(c.env, c.get('user').id, 'webhook.replay', deliveryId),
	]);
	if (!result[0].results.length) throw new ApiError(409, 'REPLAY_UNAVAILABLE', '仅能重放启用端点的失败或取消投递');
	try {
		await enqueueDue(c.env);
	} catch {
		console.warn('webhook_replay_deferred');
	}
	return c.json(ok(true));
});
externalAdmin.post('/webhooks/:id/test', async (c) => {
	const endpointId = c.req.param('id');
	await one(c.env, 'SELECT id FROM webhook_endpoints WHERE id=? AND enabled=1', endpointId);
	const mailbox = await one<{ address: string }>(
		c.env,
		'SELECT m.address FROM webhook_mailboxes b JOIN mailboxes m ON m.id=b.mailboxId WHERE b.endpointId=? LIMIT 1',
		endpointId,
	);
	const eventId = `test_${id()}`,
		now = Date.now();
	const payload: ReceivedEvent = {
		eventId,
		event: 'email.received',
		test: true,
		timestamp: new Date(now).toISOString(),
		data: {
			mailbox: mailbox.address,
			messageId: null,
			from: { email: 'test@example.com' },
			to: [{ email: mailbox.address }],
			subject: 'Yourself Mail Webhook 测试',
			snippet: '这是测试事件，不对应真实邮件。',
			hasAttachments: false,
		},
	};
	await c.env.DB.batch([
		stmt(
			c.env,
			'INSERT INTO webhook_events(id,payload,targetIds,createdAt) VALUES(?,?,?,?)',
			eventId,
			JSON.stringify(payload),
			JSON.stringify([endpointId]),
			now,
		),
		stmt(
			c.env,
			'INSERT INTO webhook_deliveries(id,eventId,endpointId,nextAttemptAt,createdAt) VALUES(?,?,?,?,?)',
			`${eventId}:${endpointId}`,
			eventId,
			endpointId,
			now,
			now,
		),
		audit(c.env, c.get('user').id, 'webhook.test', endpointId),
	]);
	try {
		await enqueueDue(c.env, eventId);
	} catch {
		console.warn('webhook_test_deferred');
	}
	return c.json(ok({ eventId }), 201);
});
