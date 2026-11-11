import { ApiError, id, type Bindings } from './core';
import { rows, stmt } from './sql';
import { decryptSecret, signWebhook, validateWebhookTarget } from './webhook-security';
export interface ReceivedEvent {
	eventId: string;
	event: 'email.received';
	timestamp: string;
	test?: boolean;
	data: {
		mailbox: string;
		messageId: string | null;
		from: { email: string; name?: string };
		to: { email: string; name?: string }[];
		subject: string;
		snippet: string;
		hasAttachments: boolean;
	};
}
export function inboundEventStatements(env: Bindings, mailboxId: string, messageId: string, payload: ReceivedEvent): D1PreparedStatement[] {
	const eventId = payload.eventId,
		now = Date.now();
	return [
		stmt(
			env,
			`INSERT INTO webhook_events(id,messageId,payload,targetIds,createdAt)
   SELECT ?,?,?,COALESCE((SELECT json_group_array(w.id) FROM webhook_endpoints w JOIN webhook_mailboxes b ON b.endpointId=w.id WHERE b.mailboxId=? AND w.enabled=1),'[]'),?
   WHERE EXISTS(SELECT 1 FROM messages WHERE id=?) ON CONFLICT DO NOTHING`,
			eventId,
			messageId,
			JSON.stringify(payload),
			mailboxId,
			now,
			messageId,
		),
		stmt(
			env,
			`INSERT INTO webhook_deliveries(id,eventId,endpointId,nextAttemptAt,createdAt)
   SELECT e.id || ':' || j.value,e.id,j.value,?,? FROM webhook_events e,json_each(e.targetIds) j WHERE e.id=? ON CONFLICT DO NOTHING`,
			now,
			now,
			eventId,
		),
	];
}
export async function enqueueDue(env: Bindings, eventId?: string) {
	if (!env.WEBHOOK_QUEUE) return;
	const found = await rows<{ id: string }>(
		env,
		`SELECT id FROM webhook_deliveries WHERE
 ((status='pending' AND nextAttemptAt<=?) OR (status='processing' AND leaseUntil<=?)) ${eventId ? 'AND eventId=?' : ''}
 ORDER BY nextAttemptAt LIMIT 100`,
		Date.now(),
		Date.now(),
		...(eventId ? [eventId] : []),
	);
	for (let start = 0; start < found.length; start += 100)
		await env.WEBHOOK_QUEUE.sendBatch(found.slice(start, start + 100).map((r) => ({ body: { deliveryId: r.id } })));
}
interface Delivery {
	id: string;
	eventId: string;
	endpointId: string;
	attempts: number;
	cycleAttempts: number;
	leaseToken: string;
}
const retryDelays = [60000, 300000, 1800000, 7200000, 43200000];
export async function dispatchDelivery(env: Bindings, deliveryId: string) {
	const now = Date.now(),
		token = id();
	// Claim and the attempt journal are committed together, including recovery of a dead consumer.
	const claimed = await env.DB.batch([
		stmt(
			env,
			`UPDATE webhook_attempts SET finishedAt=?,error='LEASE_EXPIRED' WHERE finishedAt IS NULL AND deliveryId IN
   (SELECT id FROM webhook_deliveries WHERE id=? AND status='processing' AND leaseUntil<=?)`,
			now,
			deliveryId,
			now,
		),
		stmt(
			env,
			`UPDATE webhook_deliveries SET status='failed',lastError='DELIVERY_INTERRUPTED',leaseToken=NULL,leaseUntil=NULL
         WHERE id=? AND status='processing' AND leaseUntil<=? AND cycleAttempts>=6`,
			deliveryId,
			now,
		),
		stmt(
			env,
			`UPDATE webhook_deliveries SET status='processing',leaseToken=?,leaseUntil=?,attempts=attempts+1,cycleAttempts=cycleAttempts+1
   WHERE id=? AND ((status='pending' AND nextAttemptAt<=?) OR (status='processing' AND leaseUntil<=?)) RETURNING *`,
			token,
			now + 60000,
			deliveryId,
			now,
			now,
		),
		stmt(
			env,
			`INSERT INTO webhook_attempts(id,deliveryId,attempt,startedAt) SELECT ?,id,attempts,? FROM webhook_deliveries WHERE id=? AND leaseToken=?`,
			id(),
			now,
			deliveryId,
			token,
		),
	]);
	const d = claimed[2].results[0] as unknown as Delivery | undefined;
	if (!d) return;
	let status: number | null = null,
		error: string | null = null,
		cancelled = false,
		permanentError = false;
	try {
		const endpoint = await stmt(env, 'SELECT url,enabled,encryptedSecret FROM webhook_endpoints WHERE id=?', d.endpointId).first<{
			url: string;
			enabled: number;
			encryptedSecret: string;
		}>();
		if (!endpoint?.enabled) cancelled = true;
		else {
			const event = await stmt(env, 'SELECT payload FROM webhook_events WHERE id=?', d.eventId).first<{ payload: string }>();
			if (!event) throw new Error('EVENT_MISSING');
			await validateWebhookTarget(endpoint.url);
			const secret = await decryptSecret(env, endpoint.encryptedSecret),
				timestamp = String(Math.floor(Date.now() / 1000));
			const signature = await signWebhook(secret, timestamp, d.eventId, event.payload);
			// Recheck cancellation immediately before network I/O.
			const enabled = await stmt(env, 'SELECT enabled FROM webhook_endpoints WHERE id=?', d.endpointId).first<{ enabled: number }>();
			if (!enabled?.enabled) cancelled = true;
			else {
				const response = await fetch(endpoint.url, {
					method: 'POST',
					redirect: 'manual',
					signal: AbortSignal.timeout(10000),
					headers: {
						'Content-Type': 'application/json',
						'X-Yourself-Event-Id': d.eventId,
						'X-Yourself-Timestamp': timestamp,
						'X-Yourself-Signature': `v1=${signature}`,
						'X-Yourself-Delivery-Id': d.id,
						'X-Yourself-Attempt': String(d.attempts),
					},
					body: event.payload,
				});
				status = response.status;
				await response.body?.cancel(); // Never retain callback response bodies (may contain sensitive data).
			}
		}
	} catch (e) {
		error = e instanceof ApiError ? e.code : 'NETWORK_OR_CONFIGURATION_ERROR';
		permanentError = e instanceof ApiError && e.status < 500;
	}
	const succeeded = status !== null && status >= 200 && status < 300;
	const retryable = !permanentError && (status === null || status === 408 || status === 429 || status >= 500);
	const state = cancelled
		? 'cancelled'
		: succeeded
			? 'succeeded'
			: retryable && d.cycleAttempts <= retryDelays.length
				? 'pending'
				: 'failed';
	const next = Date.now() + (retryDelays[d.cycleAttempts - 1] || 0);
	await env.DB.batch([
		stmt(
			env,
			`UPDATE webhook_attempts SET status=?,error=?,finishedAt=? WHERE deliveryId=? AND attempt=?
   AND EXISTS(SELECT 1 FROM webhook_deliveries WHERE id=? AND leaseToken=?)`,
			status,
			cancelled ? 'ENDPOINT_DISABLED' : error,
			Date.now(),
			d.id,
			d.attempts,
			d.id,
			token,
		),
		stmt(
			env,
			`UPDATE webhook_deliveries SET status=?,lastStatus=?,lastError=?,nextAttemptAt=?,leaseToken=NULL,leaseUntil=NULL WHERE id=? AND leaseToken=?`,
			state,
			status,
			cancelled ? 'ENDPOINT_DISABLED' : error,
			next,
			d.id,
			token,
		),
	]);
}
export async function processWebhookQueue(batch: MessageBatch<unknown>, env: Bindings) {
	for (const message of batch.messages) {
		if (
			!message.body ||
			typeof message.body !== 'object' ||
			!('deliveryId' in message.body) ||
			typeof message.body.deliveryId !== 'string'
		) {
			message.ack();
			continue;
		}
		try {
			await dispatchDelivery(env, message.body.deliveryId);
			message.ack();
		} catch {
			console.error('webhook_consumer_failed', { queueMessageId: message.id });
			message.retry({ delaySeconds: 60 });
		}
	}
}
