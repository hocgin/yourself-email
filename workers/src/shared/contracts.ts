import { z } from 'zod';
export const normalizeEmail = (value: string) => value.trim().toLowerCase();
export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const domainSchema = z
	.string()
	.trim()
	.toLowerCase()
	.max(253)
	.regex(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/, '请输入有效域名');
export const domainInput = z.object({ name: domainSchema, enabled: z.boolean().default(true) });
export const mailboxInput = z.object({
	address: emailSchema,
	name: z.string().trim().max(100).default(''),
	enabled: z.boolean().default(true),
});
export const grantInput = z.object({
	email: emailSchema,
	grants: z.array(z.object({ mailboxId: z.string().min(1), canRead: z.boolean(), canSend: z.boolean() })).max(500),
});
const address = z.object({ email: emailSchema, name: z.string().max(100).optional() });
export const sendInput = z
	.object({
		mailboxId: z.string().min(1),
		to: z.array(address).min(1).max(50),
		cc: z.array(address).max(50).default([]),
		bcc: z.array(address).max(50).default([]),
		subject: z.string().max(998),
		text: z.string().max(1_000_000).default(''),
		html: z.string().max(1_000_000).optional(),
		attachmentIds: z.array(z.string()).max(32).default([]),
		replyToId: z.string().optional(),
	})
	.refine((x) => x.to.length + x.cc.length + x.bcc.length <= 50, '收件人、抄送、密送总数不能超过 50')
	.refine((x) => new Set(x.attachmentIds).size === x.attachmentIds.length, '附件重复');
export const statusInput = z
	.object({ isRead: z.boolean().optional(), isArchive: z.boolean().optional(), isTrash: z.boolean().optional() })
	.refine((x) => Object.keys(x).length > 0);
export const folderSchema = z.enum(['inbox', 'sent', 'archive', 'trash']);
export type SendInput = z.infer<typeof sendInput>;
export type Address = z.infer<typeof address>;
export type Folder = z.infer<typeof folderSchema>;
export type SendState = 'pending' | 'accepted' | 'failed' | 'unknown';
export interface Identity {
	id: string;
	email: string;
	emailVerified: boolean;
	isAdmin: boolean;
}
export interface Domain {
	id: string;
	name: string;
	enabled: boolean;
	createdAt: number;
}
export interface Mailbox {
	id: string;
	domainId: string;
	address: string;
	name: string;
	enabled: boolean;
	domainEnabled: boolean;
	canRead: boolean;
	canSend: boolean;
	unreadCount: number;
}
export interface Attachment {
	id: string;
	filename: string;
	type: string;
	size: number;
	contentId: string | null;
	disposition: string;
}
export interface Message {
	replyTo: Address[];
	id: string;
	mailboxId: string;
	subject: string;
	from: Address;
	to: Address[];
	cc: Address[];
	bcc: Address[];
	snippet: string;
	date: number;
	direction: 'inbound' | 'outbound';
	messageId: string | null;
	inReplyTo: string | null;
	references: string[];
	isRead: boolean;
	isArchive: boolean;
	isTrash: boolean;
	hasAttachments: boolean;
	sendState: SendState | null;
	errorCode: string | null;
}
export interface MessageDetail extends Message {
	html: string;
	text: string;
	attachments: Attachment[];
}
export interface Page<T> {
	items: T[];
	nextCursor: string | null;
}
export interface AccountGrant {
	id: string;
	email: string;
	issuer: string | null;
	subject: string | null;
	grants: { mailboxId: string; canRead: boolean; canSend: boolean }[];
}
export interface SendResult {
	id: string;
	status: SendState;
	messageId: string | null;
	errorCode: string | null;
}
export type ApiResult<T> = { data: T } | { error: { code: string; message: string } };
