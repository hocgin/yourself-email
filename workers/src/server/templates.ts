import { ApiError, type Bindings } from './core';
import { escapeHtml } from './content';
import { templateContent, type TemplateContent } from '../shared/open-contracts';
import { one } from './sql';
export interface TemplateRow {
	id: string;
	code: string;
	name: string;
	description: string;
	enabled: number;
	mailboxes: string;
	draftVersionId: string | null;
	publishedVersionId: string | null;
	createdAt: number;
	updatedAt: number;
}
export function validateTemplate(content: TemplateContent) {
	const names = new Set(content.variables.map((v) => v.name));
	for (const source of [content.subject, content.text, content.html]) {
		const stripped = source.replace(/\{\{([A-Za-z][A-Za-z0-9_]{0,63})\}\}/g, (_, name: string) => {
			if (!names.has(name)) throw new ApiError(400, 'UNDEFINED_VARIABLE', `未声明变量：${name}`);
			return '';
		});
		if (/\{\{|\}\}/.test(stripped)) throw new ApiError(400, 'INVALID_TEMPLATE', '仅支持简单变量占位符');
	}
}
export function renderTemplate(content: TemplateContent, values: Record<string, string | number | boolean>, mock = false) {
	validateTemplate(content);
	const definitions = new Map(content.variables.map((v) => [v.name, v]));
	for (const key of Object.keys(values)) if (!definitions.has(key)) throw new ApiError(400, 'UNDEFINED_VARIABLE', `未声明变量：${key}`);
	const resolved = new Map<string, string>();
	for (const v of content.variables) {
		const value = Object.hasOwn(values, v.name) ? values[v.name] : mock ? (v.mock ?? v.default) : v.default;
		if (value === undefined && v.required) throw new ApiError(400, 'MISSING_VARIABLE', `缺少必填变量：${v.name}`);
		const text = value === undefined ? '' : String(value);
		if (text.length > v.maxLength) throw new ApiError(400, 'VARIABLE_TOO_LONG', `变量过长：${v.name}`);
		resolved.set(v.name, text);
	}
	const render = (s: string, html = false) =>
		s.replace(/\{\{([A-Za-z][A-Za-z0-9_]{0,63})\}\}/g, (_, name: string) => (html ? escapeHtml(resolved.get(name)!) : resolved.get(name)!));
	const result = { subject: render(content.subject), text: render(content.text), html: render(content.html, true) };
	templateContent.omit({ variables: true }).parse(result);
	return result;
}
export async function publishedTemplate(env: Bindings, code: string, address: string) {
	const t = await one<TemplateRow>(
		env,
		'SELECT * FROM email_templates WHERE code=? AND enabled=1 AND publishedVersionId IS NOT NULL',
		code,
	);
	const allowed = JSON.parse(t.mailboxes) as string[];
	if (allowed.length && !allowed.includes(address)) throw new ApiError(404, 'NOT_FOUND', '模板不存在或不适用于该邮箱');
	const version = await one<{ id: string; content: string }>(
		env,
		'SELECT id,content FROM email_template_versions WHERE id=? AND templateId=?',
		t.publishedVersionId,
		t.id,
	);
	return { template: t, version, content: templateContent.parse(JSON.parse(version.content)) };
}
