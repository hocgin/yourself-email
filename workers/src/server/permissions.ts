import { and, eq, sql } from 'drizzle-orm';
import { ApiError, db, type Bindings } from './core';
import { domains, grants, mailboxes, messages } from './schema';
import type { Identity, Mailbox } from '../shared/contracts';
export async function mailboxAccess(env: Bindings, user: Identity, mailboxId: string, kind: 'read' | 'send') {
	const row = await db(env)
		.select({ mailbox: mailboxes, domainEnabled: domains.enabled, canRead: grants.canRead, canSend: grants.canSend })
		.from(mailboxes)
		.innerJoin(domains, eq(domains.id, mailboxes.domainId))
		.leftJoin(grants, and(eq(grants.mailboxId, mailboxes.id), eq(grants.userId, user.id)))
		.where(eq(mailboxes.id, mailboxId))
		.get();
	if (!row || (!user.isAdmin && !(kind === 'read' ? row.canRead : row.canSend)))
		throw new ApiError(404, 'NOT_FOUND', '邮箱不存在或无权访问');
	if (kind === 'send' && (!row.domainEnabled || !row.mailbox.enabled)) throw new ApiError(409, 'MAILBOX_DISABLED', '域名或邮箱已停用');
	return row.mailbox;
}
export async function listMailboxes(env: Bindings, user: Identity): Promise<Mailbox[]> {
	const rows = await db(env)
		.select({
			mailbox: mailboxes,
			domainEnabled: domains.enabled,
			canRead: grants.canRead,
			canSend: grants.canSend,
			unreadCount: sql<number>`(select count(*) from messages where messages.mailboxId = ${mailboxes.id} and messages.isRead = 0 and messages.isTrash = 0 and messages.direction = 'inbound')`,
		})
		.from(mailboxes)
		.innerJoin(domains, eq(domains.id, mailboxes.domainId))
		.leftJoin(grants, and(eq(grants.mailboxId, mailboxes.id), eq(grants.userId, user.id)))
		.orderBy(mailboxes.address);
	return rows
		.filter((r) => user.isAdmin || r.canRead || r.canSend)
		.map((r) => ({
			...r.mailbox,
			domainEnabled: r.domainEnabled,
			canRead: user.isAdmin || !!r.canRead,
			canSend: user.isAdmin || !!r.canSend,
			unreadCount: user.isAdmin || r.canRead ? Number(r.unreadCount) : 0,
		}));
}
export async function messageAccess(env: Bindings, user: Identity, messageId: string) {
	const row = await db(env).select().from(messages).where(eq(messages.id, messageId)).get();
	if (!row) throw new ApiError(404, 'NOT_FOUND', '邮件不存在');
	await mailboxAccess(env, user, row.mailboxId, 'read');
	return row;
}
