import { beforeEach, inject } from 'vitest';
import { env } from 'cloudflare:workers';
import { applyD1Migrations } from 'cloudflare:test';
declare module 'vitest' {
	interface ProvidedContext {
		migrations: import('@cloudflare/vitest-plugin').D1Migration[];
	}
}
beforeEach(async () => {
	await applyD1Migrations(env.DB, inject('migrations'));
	// Explicit cleanup keeps tests independent with the v4 plugin's shared storage semantics.
	await env.DB.batch(
		[
			'webhook_attempts',
			'webhook_deliveries',
			'webhook_events',
			'webhook_mailboxes',
			'webhook_endpoints',
			'admin_audit_logs',
			'email_template_versions',
			'email_templates',
			'api_call_logs',
			'api_send_requests',
			'api_key_mailboxes',
			'api_keys',
			'send_requests',
			'attachments',
			'messages',
			'sessions',
			'login_transactions',
			'mailbox_grants',
			'mailboxes',
			'domains',
			'users',
		].map((table) => env.DB.prepare(`DELETE FROM ${table}`)),
	);
	let cursor: string | undefined;
	do {
		const listing = await env.MAIL_STORAGE.list({ cursor });
		if (listing.objects.length) await env.MAIL_STORAGE.delete(listing.objects.map((o) => o.key));
		cursor = listing.truncated ? listing.cursor : undefined;
	} while (cursor);
});
