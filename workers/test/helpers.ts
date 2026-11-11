import { env } from 'cloudflare:workers';
import { db, sha, type Bindings } from '../src/server/core';
import { users, domains, mailboxes, grants, sessions, messages } from '../src/server/schema';
import type { Identity } from '../src/shared/contracts';
import app from '../src/server/app';
export const testEnv = () => env as unknown as Bindings;
export const admin: Identity = { id: 'admin', email: 'admin@example.test', emailVerified: true, isAdmin: true };
export const reader: Identity = { id: 'reader', email: 'reader@example.test', emailVerified: true, isAdmin: false };
export const sender: Identity = { id: 'sender', email: 'sender@example.test', emailVerified: true, isAdmin: false };
export async function seed() {
	const conn = db(testEnv());
	await conn
		.insert(users)
		.values([admin, reader, sender].map((u) => ({ id: u.id, email: u.email, emailVerified: true, createdAt: Date.now() })));
	await conn.insert(domains).values([
		{ id: 'domain1', name: 'one.test', createdAt: Date.now() },
		{ id: 'domain2', name: 'two.test', createdAt: Date.now() },
	]);
	await conn.insert(mailboxes).values([
		{ id: 'box1', domainId: 'domain1', address: 'hello@one.test', createdAt: Date.now() },
		{ id: 'box2', domainId: 'domain2', address: 'hello@two.test', createdAt: Date.now() },
	]);
	await conn.insert(grants).values([
		{ id: 'g1', userId: reader.id, mailboxId: 'box1', canRead: true, canSend: false },
		{ id: 'g2', userId: sender.id, mailboxId: 'box1', canRead: false, canSend: true },
	]);
	for (const user of [admin, reader, sender])
		await conn.insert(sessions).values({ hash: await sha(`token-${user.id}`), userId: user.id, expiresAt: Date.now() + 86400000 });
}
export function request(
	path: string,
	user: Identity | null = admin,
	method = 'GET',
	body?: unknown,
	headers: Record<string, string> = {},
	bindings = testEnv(),
) {
	return app.request(
		`https://mail.example.test${path}`,
		{
			method,
			headers: {
				Origin: 'https://mail.example.test',
				...(user ? { Cookie: `ym_session=token-${user.id}` } : {}),
				...(body ? { 'Content-Type': 'application/json' } : {}),
				...headers,
			},
			body: body ? JSON.stringify(body) : undefined,
		},
		bindings,
	);
}
export async function storedMessage(mailboxId = 'box1', mid = 'message1') {
	await testEnv().MAIL_STORAGE.put(
		`body/${mid}`,
		JSON.stringify({ html: '<p>Hello <img src="https://tracker.test/pixel"><script>bad()</script></p>', text: 'Hello' }),
	);
	await db(testEnv())
		.insert(messages)
		.values({
			id: mid,
			mailboxId,
			dedupKey: mid,
			direction: 'inbound',
			messageId: `<${mid}@example.test>`,
			from: { email: 'peer@example.test' },
			to: [{ email: 'hello@one.test' }],
			cc: [],
			bcc: [],
			subject: 'Hello',
			references: [],
			snippet: 'Hello',
			date: Date.now(),
			bodyKey: `body/${mid}`,
			hasAttachments: false,
			createdAt: Date.now(),
		});
	return mid;
}
export const draft = {
	mailboxId: 'box1',
	to: [{ email: 'peer@example.test' }],
	cc: [],
	bcc: [],
	subject: 'Hello',
	text: 'Hello',
	attachmentIds: [],
};
