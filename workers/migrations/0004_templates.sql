CREATE TABLE email_templates (
 id TEXT PRIMARY KEY NOT NULL, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
 enabled INTEGER NOT NULL DEFAULT 1, mailboxes TEXT NOT NULL DEFAULT '[]',
 draftVersionId TEXT, publishedVersionId TEXT, createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL
);
CREATE TABLE email_template_versions (
 id TEXT PRIMARY KEY NOT NULL, templateId TEXT NOT NULL REFERENCES email_templates(id),
 content TEXT NOT NULL, createdAt INTEGER NOT NULL
);
CREATE INDEX template_versions ON email_template_versions(templateId, createdAt);
CREATE TABLE admin_audit_logs (
 id TEXT PRIMARY KEY NOT NULL, userId TEXT NOT NULL REFERENCES users(id), action TEXT NOT NULL,
 resourceId TEXT NOT NULL, createdAt INTEGER NOT NULL
);
CREATE INDEX admin_audit_date ON admin_audit_logs(createdAt);
