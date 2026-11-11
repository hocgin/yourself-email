CREATE TABLE api_keys (
 id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, prefix TEXT NOT NULL, hash TEXT NOT NULL UNIQUE,
 enabled INTEGER NOT NULL DEFAULT 1, revokedAt INTEGER, expiresAt INTEGER,
 minuteLimit INTEGER NOT NULL DEFAULT 60 CHECK(minuteLimit > 0), dayLimit INTEGER NOT NULL DEFAULT 10000 CHECK(dayLimit > 0),
 minuteWindow INTEGER NOT NULL DEFAULT 0, dayWindow INTEGER NOT NULL DEFAULT 0,
 minuteCount INTEGER NOT NULL DEFAULT 0, dayCount INTEGER NOT NULL DEFAULT 0,
 createdAt INTEGER NOT NULL, lastUsedAt INTEGER
);
CREATE TABLE api_key_mailboxes (
 apiKeyId TEXT NOT NULL REFERENCES api_keys(id), mailboxId TEXT NOT NULL REFERENCES mailboxes(id),
 canSend INTEGER NOT NULL DEFAULT 0, canRead INTEGER NOT NULL DEFAULT 0, canReadAttachments INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(apiKeyId, mailboxId)
);
CREATE INDEX api_grant_mailbox ON api_key_mailboxes(mailboxId);
CREATE TABLE api_send_requests (
 id TEXT PRIMARY KEY NOT NULL REFERENCES messages(id), apiKeyId TEXT NOT NULL REFERENCES api_keys(id),
 key TEXT NOT NULL, fingerprint TEXT NOT NULL, templateCode TEXT, templateVersionId TEXT, createdAt INTEGER NOT NULL,
 UNIQUE(apiKeyId, key)
);
CREATE TABLE api_call_logs (
 id TEXT PRIMARY KEY NOT NULL, apiKeyId TEXT NOT NULL REFERENCES api_keys(id), operation TEXT NOT NULL,
 mailbox TEXT, status INTEGER NOT NULL, errorCode TEXT, duration INTEGER NOT NULL, createdAt INTEGER NOT NULL
);
CREATE INDEX api_log_date ON api_call_logs(createdAt, id);
CREATE INDEX api_log_key_date ON api_call_logs(apiKeyId, createdAt);
