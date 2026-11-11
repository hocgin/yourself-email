import { inboundEventStatements, enqueueDue, type ReceivedEvent } from './webhooks';
import PostalMime, { type Address as PostalAddress } from 'postal-mime';
import { and, eq } from 'drizzle-orm';
import { chunks, db, id, MAX_MESSAGE, sha, type Bindings } from './core';
import { attachments, domains, mailboxes, messages } from './schema';
import { normalizeEmail, type Address } from '../shared/contracts';
function addresses(values: PostalAddress[] | undefined): Address[] {
	return (values || []).flatMap((v) =>
		'address' in v && v.address ? [{ email: normalizeEmail(v.address), name: v.name }] : 'group' in v ? addresses(v.group) : [],
	);
}
export async function receiveEmail(event: ForwardableEmailMessage, env: Bindings) {
	const conn = db(env),
		address = normalizeEmail(event.to);
	const findTarget = () =>
		conn
			.select({ mailbox: mailboxes, domain: domains })
			.from(domains)
			.leftJoin(mailboxes, and(eq(mailboxes.domainId, domains.id), eq(mailboxes.address, address)))
			.where(eq(domains.name, address.slice(address.lastIndexOf('@') + 1)))
			.get();
	let target = await findTarget();
	if (!target || !target.domain.enabled || (target.mailbox && !target.mailbox.enabled)) {
		event.setReject('Unknown or disabled recipient');
		return;
	}
	if (event.rawSize > MAX_MESSAGE) {
		event.setReject('Message exceeds 25 MiB');
		return;
	}
	const raw = await new Response(event.raw).arrayBuffer();
	if (raw.byteLength > MAX_MESSAGE) {
		event.setReject('Message exceeds 25 MiB');
		return;
	}
	const parsed = await PostalMime.parse(raw);
	if (!target.mailbox) {
		// A concurrent delivery or administrator may create this address first.
		await conn
			.insert(mailboxes)
			.values({ id: id(), domainId: target.domain.id, address, name: '', enabled: true, createdAt: Date.now() })
			.onConflictDoNothing({ target: mailboxes.address });
		target = await findTarget();
		if (!target?.mailbox || !target.domain.enabled || !target.mailbox.enabled) {
			event.setReject('Unknown or disabled recipient');
			return;
		}
	}
	const mailboxId = target.mailbox.id;
	const hash = await sha(parsed.messageId || raw),
		messageId = await sha(`${mailboxId}:${hash}`),
		key = `inbound/${mailboxId}/${messageId}`;
	if (await conn.select({ id: messages.id }).from(messages).where(eq(messages.id, messageId)).get()) return;
	const body = { html: parsed.html || '', text: parsed.text || '' };
	const files = await Promise.all(
		(parsed.attachments || []).map(async (file, index) => {
			const fileId = await sha(`${messageId}:${index}`),
				fileKey = `${key}/attachments/${index}`;
			const content = typeof file.content === 'string' ? new TextEncoder().encode(file.content) : file.content;
			await env.MAIL_STORAGE.put(fileKey, content);
			return {
				id: fileId,
				mailboxId,
				messageId,
				key: fileKey,
				filename: (file.filename || 'attachment').slice(0, 255),
				type: file.mimeType || 'application/octet-stream',
				size: content.byteLength,
				contentId: file.contentId?.replace(/[<>]/g, '') || null,
				disposition: file.disposition === 'inline' ? 'inline' : 'attachment',
				createdAt: Date.now(),
			};
		}),
	);
	await env.MAIL_STORAGE.put(`${key}/raw`, raw);
	await env.MAIL_STORAGE.put(`${key}/body`, JSON.stringify(body));
	const date = Date.parse(parsed.date || '');
	const message = {
		id: messageId,
		mailboxId,
		dedupKey: `${mailboxId}:${hash}`,
		direction: 'inbound' as const,
		messageId: parsed.messageId || null,
		inReplyTo: parsed.inReplyTo || null,
		references: (parsed.references || '').match(/<[^>]+>/g) || [],
		from: { email: normalizeEmail(parsed.from?.address || event.from), name: parsed.from?.name },
		to: addresses(parsed.to),
		replyTo: addresses(parsed.replyTo),
		cc: addresses(parsed.cc),
		bcc: addresses(parsed.bcc),
		subject: (parsed.subject || '').slice(0, 998),
		snippet: (parsed.text || '').replace(/\s+/g, ' ').slice(0, 250),
		date: Number.isFinite(date) ? date : Date.now(),
		bodyKey: `${key}/body`,
		rawKey: `${key}/raw`,
		hasAttachments: files.length > 0,
		createdAt: Date.now(),
	};
	// Freeze the event and subscription targets in the same transaction as the mail.
	const payload: ReceivedEvent = {
		eventId: `evt_${messageId}`,
		event: 'email.received',
		timestamp: new Date().toISOString(),
		data: {
			mailbox: address,
			messageId,
			from: message.from,
			to: message.to,
			subject: message.subject,
			snippet: message.snippet,
			hasAttachments: message.hasAttachments,
		},
	};
	const inserts = [
		conn.insert(messages).values(message).onConflictDoNothing(),
		...chunks(files, 5).map((group) => conn.insert(attachments).values(group).onConflictDoNothing()),
	];
	await env.DB.batch([
		...inserts.map((query) => {
			const compiled = query.toSQL();
			return env.DB.prepare(compiled.sql).bind(...compiled.params);
		}),
		...inboundEventStatements(env, mailboxId, messageId, payload),
	]);
	// Queue failure never rejects mail already committed. Cron recovers the outbox.
	try {
		await enqueueDue(env, payload.eventId);
	} catch {
		console.warn('webhook_enqueue_deferred', { eventId: payload.eventId });
	}
}
