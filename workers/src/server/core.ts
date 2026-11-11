import { drizzle } from 'drizzle-orm/d1';
import type { Context } from 'hono';
import type { Identity } from '../shared/contracts';
import * as schema from './schema';
type SendAddress = string | { email: string; name: string };
export interface Bindings {
	DB: D1Database;
	MAIL_STORAGE: R2Bucket;
	EMAIL: {
		send(message: {
			from: SendAddress;
			to: SendAddress[];
			cc?: SendAddress[];
			bcc?: SendAddress[];
			subject: string;
			text?: string;
			html?: string;
			headers?: Record<string, string>;
			attachments?: { filename: string; type: string; content: ArrayBuffer; disposition: 'attachment' | 'inline'; contentId?: string }[];
		}): Promise<{ messageId: string }>;
	};
	ASSETS: Fetcher;
	WEBHOOK_QUEUE?: Queue<{ deliveryId: string }>;
	WEBHOOK_MASTER_KEY?: string;
	APP_URL: string;
	ADMIN_EMAIL?: string;
	SSO_ISSUER: string;
	SSO_CLIENT_ID: string;
	SSO_CLIENT_SECRET: string;
	SSO_RESOURCE: string;
}
export type AppEnv = {
	Bindings: Bindings;
	Variables: { user: Identity; apiKey: import('./api-auth').ApiKeyRow; requestId: string; openMailbox: string };
};
export type Ctx = Context<AppEnv>;
export const db = (env: Bindings) => drizzle(env.DB, { schema });
export class ApiError extends Error {
	constructor(
		public status: 400 | 401 | 403 | 404 | 409 | 413 | 429 | 500 | 502 | 503,
		public code: string,
		message: string,
	) {
		super(message);
	}
}
export const id = () => crypto.randomUUID();
export async function sha(value: string | ArrayBuffer) {
	return [...new Uint8Array(await crypto.subtle.digest('SHA-256', typeof value === 'string' ? new TextEncoder().encode(value) : value))]
		.map((x) => x.toString(16).padStart(2, '0'))
		.join('');
}
export function origin(env: Bindings) {
	const u = new URL(env.APP_URL);
	if (
		u.username ||
		u.password ||
		u.search ||
		u.hash ||
		u.pathname !== '/' ||
		!(u.protocol === 'https:' || (u.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(u.hostname)))
	)
		throw new ApiError(503, 'CONFIGURATION', 'APP_URL 必须是 HTTPS origin（本机开发可用 HTTP）');
	return u.origin;
}
export const ok = <T>(data: T) => ({ data });
export const MAX_MESSAGE = 25 * 1024 * 1024;
export const MAX_UPLOAD = 18 * 1024 * 1024;

export function chunks<T>(values: T[], size: number): T[][] {
	const result: T[][] = [];
	for (let start = 0; start < values.length; start += size) result.push(values.slice(start, start + size));
	return result;
}
