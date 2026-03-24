import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const mail = sqliteTable('mail', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  headers: text('headers').notNull(),
  fromAddress: text('from_address').notNull(),
  sender: text('sender'),
  replyTo: text('reply_to'),
  deliveredTo: text('delivered_to'),
  returnPath: text('return_path'),
  toAddress: text('to_address').notNull(),
  cc: text('cc'),
  bcc: text('bcc'),
  subject: text('subject'),
  messageId: text('message_id').notNull(),
  inReplyTo: text('in_reply_to'),
  reference: text('reference'),
  date: integer('date'),
  html: text('html'),
  text: text('text'),
  attachments: text('attachments'),
  owner: text('owner').notNull(),
  isReceive: integer('is_receive', { mode: 'boolean' }).default(true),
  isRead: integer('is_read', { mode: 'boolean' }).default(false),
  isArchive: integer('is_archive', { mode: 'boolean' }).default(false),
  isTrash: integer('is_trash', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at').notNull(),
  lastUpdatedAt: integer('last_updated_at'),
})

export const userConfig = sqliteTable('user_config', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').unique().notNull(),
  isSuperAdmin: integer('is_super_admin', { mode: 'boolean' }).default(false),
  readMail: text('read_mail'),
  sentMail: text('sent_mail'),
  createdAt: integer('created_at').notNull(),
  lastUpdatedAt: integer('last_updated_at'),
})
