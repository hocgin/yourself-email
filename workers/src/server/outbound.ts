import { and, eq, gt, inArray, isNull } from 'drizzle-orm';
import { ApiError, db, id, MAX_MESSAGE, sha, type Bindings } from './core';
import { attachments, messages, sendRequests, apiSendRequests, mailboxes } from './schema';
import { mailboxAccess, messageAccess } from './permissions';
import { apiMailbox, type MachineIdentity } from './api-auth';
import type { Address, Identity, SendInput, SendResult } from '../shared/contracts';
// The deployed binding requires a string name on address objects. Use the
// supported plain-string form when no display name was supplied.
function sendAddress({ email, name }: Address): string | { email: string; name: string } {
	return name ? { email, name } : email;
}
export function estimateMessageBytes(input: SendInput, files: { size: number; filename: string }[]) {
	const bytes = (x: string) => new TextEncoder().encode(x).length;
	// Conservative MIME/header reserve plus worst-case quoted-printable body and base64 wrapping.
	return (
		16 * 1024 +
		3 * bytes(input.subject) +
		[...input.to, ...input.cc, ...input.bcc].reduce((sum, a) => sum + bytes(a.email) + 3 * bytes(a.name || '') + 16, 0) +
		3 * bytes((input.text || '') + (input.html || '')) +
		files.reduce((n, f) => n + Math.ceil(f.size / 3) * 4 + Math.ceil(f.size / 57) * 2 + 2048 + bytes(f.filename) * 3, 0)
	);
}
export interface SendMetadata {
	fingerprint?: string;
	templateCode?: string;
	templateVersionId?: string;
}
export async function sendEmail(
	env: Bindings,
	user: Identity | MachineIdentity,
	input: SendInput,
	key: string,
	metadata: SendMetadata = {},
): Promise<SendResult> {
	const machine = 'kind' in user;
	const access = async () => {
		if (!machine) return mailboxAccess(env, user as Identity, input.mailboxId, 'send');
		const row = await db(env).select().from(mailboxes).where(eq(mailboxes.id, input.mailboxId)).get();
		if (!row) throw new ApiError(404, 'NOT_FOUND', '邮箱不存在或无权访问');
		await apiMailbox(env, user.id, row.address, 'mail:send');
		return row;
	};
	if (machine && (input.attachmentIds.length || input.replyToId))
		throw new ApiError(400, 'UNSUPPORTED_FIELD', '外部 API 暂不支持附件上传或回复');
	const mailbox = await access(),
		conn = db(env),
		fingerprint = metadata.fingerprint || (await sha(JSON.stringify(input)));
	const findExisting = async () => {
		const row = machine
			? await conn
					.select({ request: apiSendRequests, message: messages })
					.from(apiSendRequests)
					.innerJoin(messages, eq(messages.id, apiSendRequests.id))
					.where(and(eq(apiSendRequests.apiKeyId, user.id), eq(apiSendRequests.key, key)))
					.get()
			: await conn
					.select({ request: sendRequests, message: messages })
					.from(sendRequests)
					.innerJoin(messages, eq(messages.id, sendRequests.id))
					.where(and(eq(sendRequests.userId, user.id), eq(sendRequests.key, key)))
					.get();
		if (!row) return null;
		if (row.request.fingerprint !== fingerprint) throw new ApiError(409, 'IDEMPOTENCY_CONFLICT', '同一发送键不能用于不同邮件');
		const stale = row.message.sendState === 'pending' && row.request.createdAt < Date.now() - 120_000;
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
		} satisfies SendResult;
	};
	const existing = await findExisting();
	if (existing) return existing;
	let parent: Awaited<ReturnType<typeof messageAccess>> | undefined;
	if (input.replyToId) {
		parent = await messageAccess(env, user as Identity, input.replyToId);
		if (parent.mailboxId !== mailbox.id) throw new ApiError(400, 'WRONG_MAILBOX', '回复必须来自原邮箱');
	}
	const files = input.attachmentIds.length ? await conn.select().from(attachments).where(inArray(attachments.id, input.attachmentIds)) : [];
	if (
		files.length !== input.attachmentIds.length ||
		files.some((f) => f.mailboxId !== mailbox.id || f.userId !== user.id || f.messageId || f.createdAt < Date.now() - 86_400_000)
	)
		throw new ApiError(400, 'INVALID_ATTACHMENT', '附件不存在、已使用、已过期或不属于此账号和邮箱');
	if (estimateMessageBytes(input, files) > MAX_MESSAGE) throw new ApiError(413, 'MESSAGE_TOO_LARGE', '邮件含编码开销超过 25 MiB');
	const mid = id(),
		bodyKey = `outbound/${mailbox.id}/${mid}/body`,
		now = Date.now(),
		refs = [...(parent?.references || []), ...(parent?.messageId ? [parent.messageId] : [])].slice(-20);
	// Limit the combined threading header to the platform's per-value limit.
	while (refs.join(' ').length > 1900) refs.shift();
	const message = {
		id: mid,
		mailboxId: mailbox.id,
		dedupKey: `outbound:${mid}`,
		direction: 'outbound' as const,
		from: { email: mailbox.address, name: mailbox.name || undefined },
		to: input.to,
		cc: input.cc,
		bcc: input.bcc,
		subject: input.subject,
		snippet: input.text.replace(/\s+/g, ' ').slice(0, 250),
		date: now,
		bodyKey,
		inReplyTo: parent?.messageId || null,
		references: refs,
		isRead: true,
		hasAttachments: files.length > 0,
		sendState: 'pending' as const,
		createdAt: now,
	};
	try {
		await conn.batch([
			conn.insert(messages).values(message),
			machine
				? conn
						.insert(apiSendRequests)
						.values({
							id: mid,
							apiKeyId: user.id,
							key,
							fingerprint,
							templateCode: metadata.templateCode,
							templateVersionId: metadata.templateVersionId,
							createdAt: now,
						})
				: conn.insert(sendRequests).values({ id: mid, userId: user.id, key, fingerprint, createdAt: now }),
		]);
	} catch (error) {
		const duplicate = await findExisting();
		if (duplicate) return duplicate;
		throw error;
	}
	let invoked = false;
	let stage = 'claim_attachments';
	const startedAt = Date.now();
	try {
		for (const file of files) {
			const claimed = await conn
				.update(attachments)
				.set({ messageId: mid })
				.where(
					and(
						eq(attachments.id, file.id),
						isNull(attachments.messageId),
						eq(attachments.userId, user.id),
						gt(attachments.createdAt, Date.now() - 86_400_000),
					),
				)
				.returning()
				.get();
			if (!claimed) throw new ApiError(409, 'ATTACHMENT_IN_USE', '附件已被其他发送请求使用');
		}
		stage = 'store_body';
		await env.MAIL_STORAGE.put(bodyKey, JSON.stringify({ html: input.html || '', text: input.text }));
		stage = 'load_attachments';
		const payloadFiles = await Promise.all(
			files.map(async (f) => {
				const object = await env.MAIL_STORAGE.get(f.key);
				if (!object) throw new ApiError(400, 'ATTACHMENT_MISSING', '附件内容不存在，请重新上传');
				return { filename: f.filename, type: f.type, content: await object.arrayBuffer(), disposition: 'attachment' as const };
			}),
		);
		// Recheck immediately before invoking the provider, including any revocation during upload.
		stage = 'authorize';
		await access();
		stage = 'provider_send';
		invoked = true;
		const result = await env.EMAIL.send({
			from: sendAddress({ email: mailbox.address, name: mailbox.name }),
			to: input.to.map(sendAddress),
			cc: input.cc.map(sendAddress),
			bcc: input.bcc.map(sendAddress),
			subject: input.subject,
			text: input.text || undefined,
			html: input.html,
			attachments: payloadFiles,
			headers: {
				...(parent?.messageId ? { 'In-Reply-To': parent.messageId } : {}),
				...(refs.length ? { References: refs.join(' ') } : {}),
			},
		});
		stage = 'persist_acceptance';
		await conn.update(messages).set({ sendState: 'accepted', messageId: result.messageId, errorCode: null }).where(eq(messages.id, mid));
		return { id: mid, status: 'accepted', messageId: result.messageId, errorCode: null };
	} catch (error) {
		const code =
			error instanceof ApiError
				? error.code
				: typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
					? error.code
					: 'SEND_UNKNOWN';
		// A documented provider rejection is definite. Network/runtime errors may occur after acceptance.
		const rejected =
			/^E_(SENDER_NOT_VERIFIED|SENDER_DOMAIN_NOT_AVAILABLE|ACCOUNT_SUSPENDED|RATE_LIMIT_EXCEEDED|DAILY_LIMIT_EXCEEDED|VALIDATION_ERROR|FIELD_MISSING|TOO_MANY_RECIPIENTS|TOO_MANY_ATTACHMENTS|CONTENT_TOO_LARGE|INVALID_|HEADER_|HEADERS_|RECIPIENT_|MESSAGE_TOO_LARGE|SUPPRESSED|BINDING_)/.test(
				code,
			);
		const status = invoked && !rejected ? 'unknown' : 'failed';
		// Record the original exception before further storage operations can fail.
		// Never include the payload, addresses, or message content in diagnostics.
		let errorMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
		const privateValues = [
			input.subject, input.text, input.html, mailbox.name,
			...[...input.to, ...input.cc, ...input.bcc].map((address) => address.name),
			...files.map((file) => file.filename),
		].filter((value): value is string => !!value).sort((a, b) => b.length - a.length);
		for (const value of privateValues) errorMessage = errorMessage.split(value).join('[redacted]');
		errorMessage = errorMessage.replace(/[^\s<>"'(),;:]+@[^\s<>"'(),;:]+/g, '[email]').replace(/[\r\n\t]/g, ' ').slice(0, 1000);
		console.warn('email_send_failed', {
			id: mid, status, code, stage, invoked, elapsedMs: Date.now() - startedAt,
			errorName: error instanceof Error ? error.name : typeof error,
			errorMessage,
		});
		await conn.update(messages).set({ sendState: status, errorCode: code }).where(eq(messages.id, mid));
		if (status === 'failed') {
			await conn.update(attachments).set({ messageId: null }).where(eq(attachments.messageId, mid));
			await conn.update(messages).set({ hasAttachments: false }).where(eq(messages.id, mid));
		}
		return { id: mid, status, messageId: null, errorCode: code };
	}
}
