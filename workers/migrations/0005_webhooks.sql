CREATE TABLE webhook_endpoints (
 id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, url TEXT NOT NULL,
 enabled INTEGER NOT NULL DEFAULT 1, encryptedSecret TEXT NOT NULL, createdAt INTEGER NOT NULL
);
CREATE TABLE webhook_mailboxes (
 endpointId TEXT NOT NULL REFERENCES webhook_endpoints(id), mailboxId TEXT NOT NULL REFERENCES mailboxes(id),
 PRIMARY KEY(endpointId, mailboxId)
);
CREATE INDEX webhook_mailbox ON webhook_mailboxes(mailboxId);
CREATE TABLE webhook_events (
 id TEXT PRIMARY KEY NOT NULL, messageId TEXT UNIQUE REFERENCES messages(id), payload TEXT NOT NULL, targetIds TEXT NOT NULL DEFAULT '[]', createdAt INTEGER NOT NULL
);
CREATE TABLE webhook_deliveries (
 id TEXT PRIMARY KEY NOT NULL, eventId TEXT NOT NULL REFERENCES webhook_events(id), endpointId TEXT NOT NULL REFERENCES webhook_endpoints(id),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','succeeded','failed','cancelled')),
 attempts INTEGER NOT NULL DEFAULT 0, cycleAttempts INTEGER NOT NULL DEFAULT 0, nextAttemptAt INTEGER NOT NULL,
 leaseToken TEXT, leaseUntil INTEGER, lastStatus INTEGER, lastError TEXT, createdAt INTEGER NOT NULL,
 UNIQUE(eventId, endpointId)
);
CREATE INDEX webhook_due ON webhook_deliveries(status, nextAttemptAt);
CREATE TABLE webhook_attempts (
 id TEXT PRIMARY KEY NOT NULL, deliveryId TEXT NOT NULL REFERENCES webhook_deliveries(id),
 attempt INTEGER NOT NULL, status INTEGER, error TEXT, startedAt INTEGER NOT NULL, finishedAt INTEGER,
 UNIQUE(deliveryId, attempt)
);
CREATE INDEX webhook_attempt_delivery ON webhook_attempts(deliveryId, startedAt);
