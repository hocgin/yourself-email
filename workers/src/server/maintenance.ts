import { stmt } from './sql';
import { and, eq, isNull, lt } from 'drizzle-orm';
import { db, type Bindings } from './core';
import { attachments, sessions, loginTransactions, messages } from './schema';
export async function cleanup(env: Bindings) {
	await env.DB.batch([
		stmt(env, 'DELETE FROM api_call_logs WHERE createdAt<?', Date.now() - 30 * 86400000),
		stmt(env, 'DELETE FROM admin_audit_logs WHERE createdAt<?', Date.now() - 90 * 86400000),
	]);
	const conn = db(env),
		now = Date.now();
	const expired = await conn
		.select()
		.from(attachments)
		.where(and(isNull(attachments.messageId), lt(attachments.createdAt, now - 86_400_000)))
		.limit(500);
	for (const file of expired) {
		// Send paths reject expired uploads, so they cannot race this cleanup to claim them.
		await env.MAIL_STORAGE.delete(file.key);
		await conn.delete(attachments).where(and(eq(attachments.id, file.id), isNull(attachments.messageId)));
	}
	await conn.batch([
		conn.delete(sessions).where(lt(sessions.expiresAt, now)),
		conn.delete(loginTransactions).where(lt(loginTransactions.expiresAt, now)),
		conn
			.update(messages)
			.set({ sendState: 'unknown', errorCode: 'SEND_INTERRUPTED' })
			.where(and(eq(messages.sendState, 'pending'), lt(messages.createdAt, now - 120_000))),
	]);
}
