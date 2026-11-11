import sanitizeHtml from 'sanitize-html';
export function safeHtml(html: string, inline: Map<string, string> = new Map()) {
	const sanitized = sanitizeHtml(html, {
		allowedTags: [
			'p',
			'br',
			'div',
			'span',
			'a',
			'strong',
			'b',
			'i',
			'em',
			'u',
			's',
			'blockquote',
			'pre',
			'code',
			'ul',
			'ol',
			'li',
			'h1',
			'h2',
			'h3',
			'h4',
			'hr',
			'table',
			'thead',
			'tbody',
			'tr',
			'th',
			'td',
			'img',
		],
		allowedAttributes: {
			a: ['href', 'title', 'target', 'rel'],
			img: ['src', 'alt', 'width', 'height'],
			td: ['colspan', 'rowspan'],
			th: ['colspan', 'rowspan'],
		},
		allowedSchemes: ['https', 'http', 'mailto'],
		allowedSchemesByTag: { img: ['cid', 'blob'] },
		transformTags: {
			a: (_tag, attrs) => ({ tagName: 'a', attribs: { ...attrs, target: '_blank', rel: 'noopener noreferrer' } }),
			img: (_tag, attrs) => {
				const cid = /^cid:([^<>\s]+)$/i.exec(attrs.src || '');
				const src = cid ? inline.get(cid[1]) || `cid:${cid[1]}` : undefined;
				return { tagName: 'img', attribs: src ? { ...attrs, src, alt: attrs.alt || '' } : { alt: attrs.alt || '远程图片已阻止', src: '' } };
			},
		},
	});
	return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src blob:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><style>body{font:17px/1.75 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;color:#27272a;overflow-wrap:anywhere;margin:0}p{margin:0 0 20px}ol,ul{padding-left:25px;margin:14px 0 20px}li{margin:8px 0}img{max-width:100%;height:auto}a{color:#5164c9}table{max-width:100%}pre{white-space:pre-wrap}blockquote{border-left:3px solid #ddd;margin-left:0;padding-left:16px;color:#666}</style></head><body>${sanitized}</body></html>`;
}
export const escapeHtml = (value: string) =>
	value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
