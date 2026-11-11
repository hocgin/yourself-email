/** In-memory fixtures for the explicit development preview; never loaded in production. */
import { templateContent, templateInput, variablesSchema, type TemplateContent } from '../shared/open-contracts';
import type { TemplateDetail } from './templates';
const welcome = `<html lang="zh-CN">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:48px 24px;background:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#292c33">
  <h1 style="font-size:26px;line-height:1.4;margin:0 0 28px;font-weight:650">欢迎加入 Yourself</h1>
  <p style="font-size:15px;line-height:1.9;margin:0 0 24px">
    你好，{{username}}，<br>
    感谢你的加入。从这里开始，让每一封邮件都有自己的归属。
  </p>
  <a href="{{login_url}}" style="display:inline-block;background:#4858c8;color:white;text-decoration:none;padding:12px 22px;border-radius:7px;font-size:15px">开始使用</a>
  <hr style="margin:36px 0 16px;border:0;border-top:1px solid #e8e8eb">
  <p style="font-size:12px;color:#858593;margin:0">Yourself Mail · 私人邮件空间</p>
</body>
</html>`;
const content: TemplateContent = {
	subject: '欢迎加入，{{username}}',
	text: '你好，{{username}}，感谢你的加入。从这里开始，让每一封邮件都有自己的归属。\n开始使用：{{login_url}}',
	html: welcome,
	variables: [
		{ name: 'username', required: true, maxLength: 100, mock: '张三' },
		{ name: 'login_url', required: true, maxLength: 1000, mock: 'https://example.com' },
	],
};
const templates: TemplateDetail[] = [
	{
		id: 'welcome',
		code: 'welcome_email',
		name: '欢迎新用户',
		description: '用户注册成功后的欢迎邮件',
		enabled: 1,
		mailboxes: [],
		draftVersionId: 'welcome-v2',
		publishedVersionId: null,
		versions: [
			{ id: 'welcome-v2', createdAt: Date.parse('2026-11-12T09:41:00+08:00'), content },
			{ id: 'welcome-v1', createdAt: Date.parse('2026-11-11T15:00:00+08:00'), content },
		],
	},
	{
		id: 'verification',
		code: 'verification_code',
		name: '验证码通知',
		description: '登录验证码',
		enabled: 1,
		mailboxes: [],
		draftVersionId: 'verification-v1',
		publishedVersionId: 'verification-v1',
		versions: [
			{
				id: 'verification-v1',
				createdAt: Date.parse('2026-11-10T16:27:00+08:00'),
				content: {
					subject: '您的验证码',
					text: '验证码：{{code}}',
					html: '<div style="padding:40px;font-family:sans-serif"><h1>验证你的身份</h1><p>你的验证码是：</p><h2>{{code}}</h2><p>请勿将验证码分享给他人。</p></div>',
					variables: [{ name: 'code', required: true, maxLength: 6, mock: '082419' }],
				},
			},
		],
	},
	{
		id: 'order',
		code: 'order_confirmation',
		name: '订单确认',
		description: '订单支付成功通知',
		enabled: 1,
		mailboxes: [],
		draftVersionId: 'order-v1',
		publishedVersionId: 'order-v1',
		versions: [
			{
				id: 'order-v1',
				createdAt: Date.parse('2026-11-08T11:03:00+08:00'),
				content: {
					subject: '订单 {{order_id}} 已确认',
					text: '感谢您的订购。订单编号：{{order_id}}',
					html: '<div style="padding:40px;font-family:sans-serif"><h1>订单已确认</h1><p>感谢您的订购。订单编号：{{order_id}}</p></div>',
					variables: [{ name: 'order_id', required: true, maxLength: 100, mock: 'YM-20261112' }],
				},
			},
		],
	},
];
function render(content: TemplateContent, values: ReturnType<typeof variablesSchema.parse>) {
	const definitions = new Map(content.variables.map((v) => [v.name, v]));
	for (const name of Object.keys(values)) if (!definitions.has(name)) throw new Error(`未声明变量：${name}`);
	const escape = (value: string) =>
		value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
	const replace = (source: string, html = false) =>
		source.replace(/\{\{([A-Za-z][A-Za-z0-9_]{0,63})\}\}/g, (_, name: string) => {
			const definition = definitions.get(name);
			if (!definition) throw new Error(`未声明变量：${name}`);
			const value = values[name] ?? definition.mock ?? definition.default;
			if (definition.required && value === undefined) throw new Error(`缺少必填变量：${name}`);
			const text = String(value ?? '');
			if (text.length > definition.maxLength) throw new Error(`变量过长：${name}`);
			return html ? escape(text) : text;
		});
	const doc = new DOMParser().parseFromString(replace(content.html, true), 'text/html');
	doc.querySelectorAll('script,iframe,object,embed,link,meta,base').forEach((el) => el.remove());
	doc.querySelectorAll('*').forEach((el) =>
		[...el.attributes].forEach((a) => {
			if (/^on/i.test(a.name)) el.removeAttribute(a.name);
		}),
	);
	return {
		subject: replace(content.subject),
		text: replace(content.text),
		html: `<meta http-equiv="Content-Security-Policy" content="default-src 'none';style-src 'unsafe-inline'"><style>body{margin:0;font-family:system-ui,sans-serif}</style>${doc.body.outerHTML}`,
	};
}
export function templatePreviewResponse(path: string, method: string, body?: BodyInit | null): Response | undefined {
	if (!path.startsWith('/admin/templates')) return;
	const respond = (data: unknown) => Response.json({ data });
	try {
		const input = typeof body === 'string' ? JSON.parse(body) : {};
		if (path === '/admin/templates/preview')
			return respond(render(templateContent.parse(input.content), variablesSchema.parse(input.variables || {})));
		if (path === '/admin/templates' && method === 'GET') return respond(templates.map(({ versions: _versions, ...template }) => template));
		const id = path.split('/')[3];
		const template = templates.find((t) => t.id === id);
		if ((method === 'POST' && path === '/admin/templates') || (method === 'PUT' && template)) {
			const data = templateInput.parse(input),
				version = { id: crypto.randomUUID(), createdAt: Date.now(), content: data.content };
			if (!template && templates.some((t) => t.code === data.code)) throw new Error('模板编码已存在');
			if (template)
				Object.assign(template, {
					...data,
					enabled: Number(data.enabled),
					draftVersionId: version.id,
					versions: [version, ...template.versions],
				});
			else
				templates.unshift({
					...data,
					id: crypto.randomUUID(),
					enabled: Number(data.enabled),
					draftVersionId: version.id,
					publishedVersionId: null,
					versions: [version],
				});
			return respond({ id: template?.id || templates[0].id });
		}
		if (!template) return Response.json({ error: { code: 'NOT_FOUND', message: '模板不存在' } }, { status: 404 });
		if (path.endsWith('/publish')) {
			template.publishedVersionId = input.versionId;
			return respond(true);
		}
		if (path.endsWith('/test'))
			return respond({ id: crypto.randomUUID(), status: 'accepted', messageId: '<local-preview@example.test>', errorCode: null });
		return respond(template);
	} catch (e) {
		return Response.json({ error: { code: 'PREVIEW', message: e instanceof Error ? e.message : '演示请求失败' } }, { status: 400 });
	}
}
