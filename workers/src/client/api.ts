import type { ApiResult } from '../shared/contracts';
export class HttpError extends Error {
	constructor(
		public status: number,
		public code: string,
		message: string,
	) {
		super(message);
	}
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
	const res = await fetch(`/api${path}`, {
		credentials: 'same-origin',
		...options,
		headers: { ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
	});
	const result = (await res.json()) as ApiResult<T>;
	if ('error' in result) throw new HttpError(res.status, result.error.code, result.error.message);
	return result.data;
}
export const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });
export const errorText = (error: unknown) => (error instanceof Error ? error.message : '操作失败，请重试');

export async function downloadAttachment(id: string, filename: string) {
	const response = await fetch(`/api/attachments/${encodeURIComponent(id)}`, { credentials: 'same-origin' });
	if (!response.ok) {
		const payload = (await response.json()) as { error?: { message?: string } };
		throw new Error(payload.error?.message || '附件下载失败');
	}
	const url = URL.createObjectURL(await response.blob());
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	link.click();
	setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
