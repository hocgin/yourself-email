import { z } from 'zod';
import { emailSchema } from './contracts';
export const scopeSchema = z.enum(['mail:send', 'mail:read', 'attachment:read']);
export type Scope = z.infer<typeof scopeSchema>;
export const mailboxGrant = z
	.object({ email: emailSchema, scopes: z.array(scopeSchema).min(1).max(3) })
	.strict()
	.refine((x) => !x.scopes.includes('attachment:read') || x.scopes.includes('mail:read'), '附件权限需要读取权限');
export const keyInput = z
	.object({
		name: z.string().trim().min(1).max(100),
		enabled: z.boolean().default(true),
		expiresAt: z.number().int().positive().nullable().default(null),
		minuteLimit: z.number().int().min(1).max(100000).default(60),
		dayLimit: z.number().int().min(1).max(10000000).default(10000),
		mailboxes: z
			.array(mailboxGrant)
			.max(500)
			.refine((x) => new Set(x.map((g) => g.email)).size === x.length, '邮箱重复'),
	})
	.strict();
const address = z.object({ email: emailSchema, name: z.string().max(100).optional() }).strict();
const recipients = {
	from: emailSchema,
	to: z.array(address).min(1).max(50),
	cc: z.array(address).max(50).default([]),
	bcc: z.array(address).max(50).default([]),
};
export const variablesSchema = z.record(
	z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,63}$/),
	z.union([z.string().max(10000), z.number().finite(), z.boolean()]),
);
export const openSendInput = z
	.union([
		z
			.object({ ...recipients, subject: z.string().max(998), text: z.string().max(1000000), html: z.string().max(1000000).optional() })
			.strict(),
		z.object({ ...recipients, templateCode: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/), variables: variablesSchema.default({}) }).strict(),
	])
	.refine((x) => x.to.length + x.cc.length + x.bcc.length <= 50, '收件人总数不能超过 50');
export const variableDefinition = z
	.object({
		name: z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,63}$/),
		required: z.boolean().default(false),
		default: z.union([z.string().max(10000), z.number().finite(), z.boolean()]).optional(),
		mock: z.union([z.string().max(10000), z.number().finite(), z.boolean()]).optional(),
		maxLength: z.number().int().min(1).max(10000).default(10000),
	})
	.strict();
export const templateContent = z
	.object({
		subject: z.string().max(998),
		text: z.string().max(1000000),
		html: z.string().max(1000000).default(''),
		variables: z
			.array(variableDefinition)
			.max(100)
			.refine((x) => new Set(x.map((v) => v.name)).size === x.length, '变量重复'),
	})
	.strict();
export const templateInput = z
	.object({
		code: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
		name: z.string().trim().min(1).max(100),
		description: z.string().max(1000).default(''),
		enabled: z.boolean().default(true),
		mailboxes: z.array(emailSchema).max(500).default([]),
		content: templateContent,
	})
	.strict();
export const webhookInput = z
	.object({
		name: z.string().trim().min(1).max(100),
		url: z.string().url().max(2048),
		enabled: z.boolean().default(true),
		mailboxes: z
			.array(emailSchema)
			.min(1)
			.max(500)
			.refine((x) => new Set(x).size === x.length, '邮箱重复'),
	})
	.strict();
export const openListInput = z
	.object({
		q: z.string().max(200).default(''),
		unread: z.enum(['true', 'false']).optional(),
		from: emailSchema.optional(),
		since: z.string().datetime({ offset: true }).optional(),
		until: z.string().datetime({ offset: true }).optional(),
		cursor: z.string().max(1024).optional(),
		folder: z.enum(['inbox', 'archive', 'trash']).default('inbox'),
		limit: z.coerce.number().int().min(1).max(30).default(30),
	})
	.strict()
	.refine((x) => !x.since || !x.until || Date.parse(x.since) <= Date.parse(x.until), '时间范围无效');
export type TemplateContent = z.infer<typeof templateContent>;

export type OpenSendInput = z.infer<typeof openSendInput>;
export type KeyConfig = z.infer<typeof keyInput>;
export interface OpenMailbox {
	email: string;
	name: string;
	enabled: boolean;
	domainEnabled: boolean;
	scopes: Scope[];
}
export interface OpenMessage {
	id: string;
	mailbox: string;
	from: import('./contracts').Address;
	to: import('./contracts').Address[];
	cc: import('./contracts').Address[];
	replyTo: import('./contracts').Address[];
	subject: string;
	snippet: string;
	date: number;
	messageId: string | null;
	isRead: boolean;
	isArchive: boolean;
	isTrash: boolean;
	hasAttachments: boolean;
}
export interface OpenMessageDetail extends OpenMessage {
	html: string;
	text: string;
	attachments?: import('./contracts').Attachment[];
}
export type OpenSendResult = import('./contracts').SendResult;
