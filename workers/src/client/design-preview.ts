import { createAdminPreview } from './admin-preview-fixtures';
import { templatePreviewResponse } from './template-preview-fixtures';
/** Development-only in-memory preview. Never authenticates or writes to the Worker. */
import type { Attachment, Identity, Mailbox, MessageDetail, SendInput } from '../shared/contracts';
import { sendInput } from '../shared/contracts';
const date = (time: string) => Date.parse(`2026-11-11T${time}:00+08:00`);
const body = `<p>你好，</p><p>整体方向很不错，下面是我整理的几点具体反馈，供你参考：</p><ol><li>首页的主视觉已经很有吸引力，建议将核心文案再精简一些，突出产品的主要价值。</li><li>功能介绍部分的信息层级可以更清晰，尝试用更明确的标题和简短描述，方便用户快速理解。</li><li>配色和间距整体协调，移动端的适配也基本完善，目前没有明显问题。</li></ol><p>附件中是我标注了修改建议的设计稿，麻烦你有空时查看一下。如果有任何问题，我们随时讨论。</p><p>谢谢！<br>陈林</p>`;
const html = (content: string) =>
	`<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none';style-src 'unsafe-inline'"><style>body{font:17px/1.75 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;color:#27272a;margin:0;overflow-wrap:anywhere}p{margin:0 0 20px}ol{padding-left:25px;margin:14px 0 20px}li{margin:8px 0}pre{white-space:pre-wrap}</style></head><body>${content}</body></html>`;
const user: Identity = { id: 'preview-user', email: 'hello@example.com', emailVerified: true, isAdmin: true };
const boxes: Mailbox[] = [
	{
		id: 'personal',
		domainId: 'example',
		address: 'hello@example.com',
		name: '个人邮箱',
		enabled: true,
		domainEnabled: true,
		canRead: true,
		canSend: true,
		unreadCount: 3,
	},
	{
		id: 'work',
		domainId: 'studio',
		address: 'work@studio.example',
		name: '工作邮箱',
		enabled: true,
		domainEnabled: true,
		canRead: true,
		canSend: true,
		unreadCount: 0,
	},
];
const rows = [
	['wang', '王珊', '本周产品评审会议安排', '会议定于本周五下午 3 点，请提前查看议程…', '16:42', false],
	['li', '李明', '市场活动物料更新', '附件是更新后的活动海报和邮件模板，请查收。', '15:27', false],
	['chen', '陈林', '关于新项目的设计反馈', '整体方向很不错，下面是我整理的几点具体反馈…', '14:18', true],
	['zhou', '周婷', '域名邮箱配置已完成', 'work@studio.example 的配置已生效，可正常收发邮件。', '12:03', true],
	['huang', '黄伟', '合作报价单（修订版）', '根据昨天的沟通，我们已更新了报价内容。', '10:36', false],
	['liu', '刘佳', '季度总结文档初稿', '这是本季度的工作总结初稿，欢迎提出修改意见。', '09:21', true],
	['zhang', '张磊', '下周团队例会提醒', '例会将于下周一上午 10 点举行，会议室已预订。', '08:44', true],
	['zhao', '赵欣', '用户访谈结果摘要', '本轮访谈共覆盖 8 位用户，主要结论和建议见附件。', '08:17', true],
] as const;
let messages: MessageDetail[] = rows.map(([id, name, subject, snippet, time, isRead]) => ({
	id,
	mailboxId: 'personal',
	subject,
	from: { email: id === 'chen' ? 'chen.lin@example.com' : `${id}@example.com`, name },
	to: [{ email: 'hello@example.com' }],
	cc: [],
	bcc: [],
	replyTo: [],
	snippet,
	date: date(time),
	direction: 'inbound',
	messageId: `<${id}@example.com>`,
	inReplyTo: null,
	references: [],
	isRead,
	isArchive: false,
	isTrash: false,
	hasAttachments: id === 'chen',
	sendState: null,
	errorCode: null,
	html: html(id === 'chen' ? body : `<p>你好，</p><p>${snippet}</p><p>谢谢！<br>${name}</p>`),
	text: id === 'chen' ? '你好，整体方向很不错，下面是我整理的几点具体反馈。' : snippet,
	attachments:
		id === 'chen'
			? [
					{
						id: 'design-pdf',
						filename: '新项目设计稿_反馈标注.pdf',
						type: 'application/pdf',
						size: 2.4 * 1024 * 1024,
						contentId: null,
						disposition: 'attachment',
					},
				]
			: [],
}));
const files = new Map<string, File>();
const uploaded = new Map<string, Attachment>();
const sends = new Map<string, { id: string; status: 'accepted'; messageId: string; errorCode: null }>();
export function startDesignPreview() {
	let signedIn = new URLSearchParams(location.search).get('state') !== 'login';
	const original = window.fetch.bind(window);
	const adminPreview = createAdminPreview(boxes, user);
	window.fetch = async (input, options) => {
		const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.origin);
		if (url.origin !== location.origin || !url.pathname.startsWith('/api/')) return original(input, options);
		const path = url.pathname.slice(4),
			method = options?.method || 'GET',
			respond = (data: unknown) => Promise.resolve(Response.json({ data })),
			fail = (status: number, message: string) => Promise.resolve(Response.json({ error: { code: 'PREVIEW', message } }, { status }));
		if (!signedIn) return fail(401, '演示已退出，刷新页面可重新进入。');
		if (path === '/me') return respond(user);
		if (path === '/auth/logout') {
			signedIn = false;
			return respond(true);
		}
		if (path === '/mailboxes')
			return respond(
				boxes.map((b) => ({
					...b,
					unreadCount: messages.filter((m) => m.mailboxId === b.id && !m.isRead && !m.isTrash && m.direction === 'inbound').length,
				})),
			);
		const adminResponse = adminPreview(path, method, options?.body, url.searchParams);
		if (adminResponse) return adminResponse;
		const templateResponse = templatePreviewResponse(path, method, options?.body);
		if (templateResponse) return templateResponse;
		if (path.startsWith('/admin/')) return fail(400, '此演示仅预览管理界面，不保存管理配置。');
		if (path === '/attachments' && method === 'POST') {
			const form = options?.body as FormData,
				file = form.get('file');
			if (!(file instanceof File)) return fail(400, '请选择附件');
			const attachment = {
				id: crypto.randomUUID(),
				filename: file.name,
				type: file.type,
				size: file.size,
				contentId: null,
				disposition: 'attachment',
			};
			files.set(attachment.id, file);
			uploaded.set(attachment.id, attachment);
			return respond(attachment);
		}
		if (path.startsWith('/attachments/')) {
			const id = path.split('/').at(-1)!;
			const file = files.get(id);
			return new Response(file || new Blob(['Yourself Mail design preview attachment'], { type: 'text/plain' }), {
				headers: {
					'Content-Type': file?.type || 'text/plain',
					'Content-Disposition': `attachment; filename="${file?.name || 'design-preview.txt'}"`,
				},
			});
		}
		if (path === '/messages/send' && method === 'POST') {
			const input = sendInput.safeParse(JSON.parse(options?.body as string));
			if (!input.success) return fail(400, input.error.issues.map((i) => i.message).join('; '));
			const draft: SendInput = input.data;
			const key = new Headers(options?.headers).get('Idempotency-Key') || '';
			if (sends.has(key)) return respond(sends.get(key));
			const id = crypto.randomUUID(),
				result = { id, status: 'accepted' as const, messageId: `<${id}@preview>`, errorCode: null };
			messages.unshift({
				id,
				mailboxId: draft.mailboxId,
				from: { email: boxes.find((b) => b.id === draft.mailboxId)!.address },
				to: draft.to,
				cc: draft.cc,
				bcc: draft.bcc,
				replyTo: [],
				subject: draft.subject,
				snippet: draft.text,
				date: Date.now(),
				direction: 'outbound',
				messageId: result.messageId,
				inReplyTo: null,
				references: [],
				isRead: true,
				isArchive: false,
				isTrash: false,
				hasAttachments: !!draft.attachmentIds.length,
				sendState: 'accepted',
				errorCode: null,
				html: html(`<pre>${draft.text.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!)}</pre>`),
				text: draft.text,
				attachments: draft.attachmentIds.map((id) => uploaded.get(id)!).filter(Boolean),
			});
			sends.set(key, result);
			return respond(result);
		}
		if (path === '/messages' || /\/messages\/[^/]+\/history$/.test(path)) {
			let list = messages.filter(
				(m) => m.mailboxId === (url.searchParams.get('mailboxId') || messages.find((m) => m.id === path.split('/')[2])?.mailboxId),
			);
			if (!path.endsWith('/history')) {
				const folder = url.searchParams.get('folder');
				list = list.filter((m) =>
					folder === 'trash'
						? m.isTrash
						: !m.isTrash &&
							(folder === 'archive' ? m.isArchive : !m.isArchive && m.direction === (folder === 'sent' ? 'outbound' : 'inbound')),
				);
				const q = (url.searchParams.get('q') || '').toLowerCase();
				list = list.filter((m) => [m.subject, m.snippet, m.from.name, m.from.email].join(' ').toLowerCase().includes(q));
				if (url.searchParams.get('unread') === 'true') list = list.filter((m) => !m.isRead);
			}
			return respond({ items: list, nextCursor: null });
		}
		if (path.startsWith('/messages/')) {
			const message = messages.find((m) => m.id === path.split('/')[2]);
			if (!message) return fail(404, '邮件不存在');
			if (method === 'PATCH') {
				Object.assign(message, JSON.parse(options?.body as string));
				return respond(true);
			}
			return respond(message);
		}
		return fail(404, '演示接口不存在');
	};
}
