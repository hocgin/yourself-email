import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
export const users = sqliteTable(
	'users',
	{
		id: text().primaryKey(),
		email: text().notNull().unique(),
		issuer: text(),
		subject: text(),
		emailVerified: integer({ mode: 'boolean' }).notNull().default(false),
		createdAt: integer().notNull(),
	},
	(t) => [uniqueIndex('user_identity').on(t.issuer, t.subject)],
);
export const domains = sqliteTable('domains', {
	id: text().primaryKey(),
	name: text().notNull().unique(),
	enabled: integer({ mode: 'boolean' }).notNull().default(true),
	createdAt: integer().notNull(),
});
export const mailboxes = sqliteTable(
	'mailboxes',
	{
		id: text().primaryKey(),
		domainId: text()
			.notNull()
			.references(() => domains.id),
		address: text().notNull().unique(),
		name: text().notNull().default(''),
		enabled: integer({ mode: 'boolean' }).notNull().default(true),
		createdAt: integer().notNull(),
	},
	(t) => [index('mailbox_domain').on(t.domainId)],
);
export const grants = sqliteTable(
	'mailbox_grants',
	{
		id: text().primaryKey(),
		userId: text()
			.notNull()
			.references(() => users.id),
		mailboxId: text()
			.notNull()
			.references(() => mailboxes.id),
		canRead: integer({ mode: 'boolean' }).notNull(),
		canSend: integer({ mode: 'boolean' }).notNull(),
	},
	(t) => [uniqueIndex('grant_user_mailbox').on(t.userId, t.mailboxId), index('grant_mailbox').on(t.mailboxId)],
);
export const sessions = sqliteTable(
	'sessions',
	{
		hash: text().primaryKey(),
		userId: text()
			.notNull()
			.references(() => users.id),
		expiresAt: integer().notNull(),
	},
	(t) => [index('session_expiry').on(t.expiresAt)],
);
export const loginTransactions = sqliteTable('login_transactions', {
	hash: text().primaryKey(),
	state: text().notNull(),
	nonce: text().notNull(),
	verifier: text().notNull(),
	issuer: text().notNull(),
	clientId: text().notNull(),
	resource: text().notNull(),
	origin: text().notNull(),
	expiresAt: integer().notNull(),
});
export const messages = sqliteTable(
	'messages',
	{
		id: text().primaryKey(),
		mailboxId: text()
			.notNull()
			.references(() => mailboxes.id),
		dedupKey: text().notNull().unique(),
		direction: text({ enum: ['inbound', 'outbound'] }).notNull(),
		messageId: text(),
		inReplyTo: text(),
		references: text({ mode: 'json' }).$type<string[]>().notNull(),
		from: text({ mode: 'json' }).$type<{ email: string; name?: string }>().notNull(),
		replyTo: text({ mode: 'json' }).$type<{ email: string; name?: string }[]>().notNull().default([]),
		to: text({ mode: 'json' }).$type<{ email: string; name?: string }[]>().notNull(),
		cc: text({ mode: 'json' }).$type<{ email: string; name?: string }[]>().notNull(),
		bcc: text({ mode: 'json' }).$type<{ email: string; name?: string }[]>().notNull(),
		subject: text().notNull(),
		snippet: text().notNull(),
		date: integer().notNull(),
		bodyKey: text().notNull(),
		rawKey: text(),
		isRead: integer({ mode: 'boolean' }).notNull().default(false),
		isArchive: integer({ mode: 'boolean' }).notNull().default(false),
		isTrash: integer({ mode: 'boolean' }).notNull().default(false),
		hasAttachments: integer({ mode: 'boolean' }).notNull(),
		sendState: text({ enum: ['pending', 'accepted', 'failed', 'unknown'] }),
		errorCode: text(),
		createdAt: integer().notNull(),
	},
	(t) => [index('message_mailbox_date').on(t.mailboxId, t.date, t.id), index('message_reply').on(t.mailboxId, t.inReplyTo)],
);
export const attachments = sqliteTable(
	'attachments',
	{
		id: text().primaryKey(),
		mailboxId: text()
			.notNull()
			.references(() => mailboxes.id),
		userId: text().references(() => users.id),
		messageId: text().references(() => messages.id),
		key: text().notNull(),
		filename: text().notNull(),
		type: text().notNull(),
		size: integer().notNull(),
		contentId: text(),
		disposition: text().notNull(),
		createdAt: integer().notNull(),
	},
	(t) => [index('attachment_message').on(t.messageId), index('upload_expiry').on(t.createdAt)],
);
export const sendRequests = sqliteTable(
	'send_requests',
	{
		id: text()
			.primaryKey()
			.references(() => messages.id),
		userId: text()
			.notNull()
			.references(() => users.id),
		key: text().notNull(),
		fingerprint: text().notNull(),
		createdAt: integer().notNull(),
	},
	(t) => [uniqueIndex('send_idempotency').on(t.userId, t.key)],
);

// Machine identities are independent of SSO users. Counters are updated together in one SQL statement.
export const apiKeys = sqliteTable('api_keys', {
	id: text().primaryKey(),
	name: text().notNull(),
	prefix: text().notNull(),
	hash: text().notNull().unique(),
	enabled: integer().notNull().default(1),
	revokedAt: integer(),
	expiresAt: integer(),
	minuteLimit: integer().notNull().default(60),
	dayLimit: integer().notNull().default(10000),
	minuteWindow: integer().notNull().default(0),
	dayWindow: integer().notNull().default(0),
	minuteCount: integer().notNull().default(0),
	dayCount: integer().notNull().default(0),
	createdAt: integer().notNull(),
	lastUsedAt: integer(),
});
export const apiKeyMailboxes = sqliteTable(
	'api_key_mailboxes',
	{
		apiKeyId: text()
			.notNull()
			.references(() => apiKeys.id),
		mailboxId: text()
			.notNull()
			.references(() => mailboxes.id),
		canSend: integer().notNull().default(0),
		canRead: integer().notNull().default(0),
		canReadAttachments: integer().notNull().default(0),
	},
	(t) => [uniqueIndex('api_grant_unique').on(t.apiKeyId, t.mailboxId), index('api_grant_mailbox').on(t.mailboxId)],
);
export const apiSendRequests = sqliteTable(
	'api_send_requests',
	{
		id: text()
			.primaryKey()
			.references(() => messages.id),
		apiKeyId: text()
			.notNull()
			.references(() => apiKeys.id),
		key: text().notNull(),
		fingerprint: text().notNull(),
		templateCode: text(),
		templateVersionId: text(),
		createdAt: integer().notNull(),
	},
	(t) => [uniqueIndex('api_send_unique').on(t.apiKeyId, t.key)],
);
export const apiCallLogs = sqliteTable(
	'api_call_logs',
	{
		id: text().primaryKey(),
		apiKeyId: text()
			.notNull()
			.references(() => apiKeys.id),
		operation: text().notNull(),
		mailbox: text(),
		status: integer().notNull(),
		errorCode: text(),
		duration: integer().notNull(),
		createdAt: integer().notNull(),
	},
	(t) => [index('api_log_date').on(t.createdAt, t.id), index('api_log_key_date').on(t.apiKeyId, t.createdAt)],
);
export const emailTemplates = sqliteTable('email_templates', {
	id: text().primaryKey(),
	code: text().notNull().unique(),
	name: text().notNull(),
	description: text().notNull().default(''),
	enabled: integer().notNull().default(1),
	mailboxes: text().notNull().default('[]'),
	draftVersionId: text(),
	publishedVersionId: text(),
	createdAt: integer().notNull(),
	updatedAt: integer().notNull(),
});
export const emailTemplateVersions = sqliteTable(
	'email_template_versions',
	{
		id: text().primaryKey(),
		templateId: text()
			.notNull()
			.references(() => emailTemplates.id),
		content: text().notNull(),
		createdAt: integer().notNull(),
	},
	(t) => [index('template_versions').on(t.templateId, t.createdAt)],
);
export const adminAuditLogs = sqliteTable(
	'admin_audit_logs',
	{
		id: text().primaryKey(),
		userId: text()
			.notNull()
			.references(() => users.id),
		action: text().notNull(),
		resourceId: text().notNull(),
		createdAt: integer().notNull(),
	},
	(t) => [index('admin_audit_date').on(t.createdAt)],
);
export const webhookEndpoints = sqliteTable('webhook_endpoints', {
	id: text().primaryKey(),
	name: text().notNull(),
	url: text().notNull(),
	enabled: integer().notNull().default(1),
	encryptedSecret: text().notNull(),
	createdAt: integer().notNull(),
});
export const webhookMailboxes = sqliteTable(
	'webhook_mailboxes',
	{
		endpointId: text()
			.notNull()
			.references(() => webhookEndpoints.id),
		mailboxId: text()
			.notNull()
			.references(() => mailboxes.id),
	},
	(t) => [uniqueIndex('webhook_binding_unique').on(t.endpointId, t.mailboxId), index('webhook_mailbox').on(t.mailboxId)],
);
export const webhookEvents = sqliteTable('webhook_events', {
	id: text().primaryKey(),
	messageId: text()
		.unique()
		.references(() => messages.id),
	payload: text().notNull(),
	targetIds: text().notNull().default('[]'),
	createdAt: integer().notNull(),
});
export const webhookDeliveries = sqliteTable(
	'webhook_deliveries',
	{
		id: text().primaryKey(),
		eventId: text()
			.notNull()
			.references(() => webhookEvents.id),
		endpointId: text()
			.notNull()
			.references(() => webhookEndpoints.id),
		status: text().notNull().default('pending'),
		attempts: integer().notNull().default(0),
		cycleAttempts: integer().notNull().default(0),
		nextAttemptAt: integer().notNull(),
		leaseToken: text(),
		leaseUntil: integer(),
		lastStatus: integer(),
		lastError: text(),
		createdAt: integer().notNull(),
	},
	(t) => [uniqueIndex('webhook_delivery_unique').on(t.eventId, t.endpointId), index('webhook_due').on(t.status, t.nextAttemptAt)],
);
export const webhookAttempts = sqliteTable(
	'webhook_attempts',
	{
		id: text().primaryKey(),
		deliveryId: text()
			.notNull()
			.references(() => webhookDeliveries.id),
		attempt: integer().notNull(),
		status: integer(),
		error: text(),
		startedAt: integer().notNull(),
		finishedAt: integer(),
	},
	(t) => [
		uniqueIndex('webhook_attempt_unique').on(t.deliveryId, t.attempt),
		index('webhook_attempt_delivery').on(t.deliveryId, t.startedAt),
	],
);
