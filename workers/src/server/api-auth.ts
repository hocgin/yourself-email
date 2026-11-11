import { ApiError, sha, type Bindings } from './core';
import { emailSchema } from '../shared/contracts';
import type { Scope } from '../shared/open-contracts';
import { one, stmt } from './sql';
export interface ApiKeyRow {
	id: string;
	name: string;
	prefix: string;
	enabled: number;
	revokedAt: number | null;
	expiresAt: number | null;
	minuteLimit: number;
	dayLimit: number;
	minuteWindow: number;
	dayWindow: number;
	minuteCount: number;
	dayCount: number;
	createdAt: number;
	lastUsedAt: number | null;
}
export interface MachineIdentity {
	kind: 'apiKey';
	id: string;
}
export async function activeKey(env: Bindings, keyId: string) {
	const row = await stmt(
		env,
		'SELECT id FROM api_keys WHERE id=? AND enabled=1 AND revokedAt IS NULL AND (expiresAt IS NULL OR expiresAt>?)',
		keyId,
		Date.now(),
	).first();
	if (!row) throw new ApiError(401, 'INVALID_API_KEY', 'API 密钥无效或已失效');
}
export async function authenticateKey(env: Bindings, header: string | undefined) {
	const token = /^Bearer (ym_[A-Za-z0-9_-]{43})$/.exec(header || '')?.[1];
	if (!token) throw new ApiError(401, 'INVALID_API_KEY', '需要有效的 Bearer API 密钥');
	const row = await stmt(
		env,
		'SELECT * FROM api_keys WHERE hash=? AND enabled=1 AND revokedAt IS NULL AND (expiresAt IS NULL OR expiresAt>?)',
		await sha(token),
		Date.now(),
	).first<ApiKeyRow>();
	if (!row) throw new ApiError(401, 'INVALID_API_KEY', 'API 密钥无效或已失效');
	return row;
}
export async function consumeQuota(env: Bindings, key: ApiKeyRow) {
	const now = Date.now(),
		minute = Math.floor(now / 60000),
		day = Math.floor(now / 86400000);
	const row = await stmt(
		env,
		`UPDATE api_keys SET minuteWindow=?, dayWindow=?,
 minuteCount=CASE WHEN minuteWindow=? THEN minuteCount+1 ELSE 1 END,
 dayCount=CASE WHEN dayWindow=? THEN dayCount+1 ELSE 1 END, lastUsedAt=?
 WHERE id=? AND enabled=1 AND revokedAt IS NULL AND (expiresAt IS NULL OR expiresAt>?)
 AND (minuteWindow<>? OR minuteCount<minuteLimit) AND (dayWindow<>? OR dayCount<dayLimit) RETURNING id`,
		minute,
		day,
		minute,
		day,
		now,
		key.id,
		now,
		minute,
		day,
	).first();
	if (row) return null;
	await activeKey(env, key.id);
	const current = await one<ApiKeyRow>(env, 'SELECT * FROM api_keys WHERE id=?', key.id);
	return Math.max(
		1,
		Math.ceil(
			((current.dayWindow === day && current.dayCount >= current.dayLimit ? (day + 1) * 86400000 : (minute + 1) * 60000) - now) / 1000,
		),
	);
}
export interface ApiMailbox {
	id: string;
	address: string;
	name: string;
	enabled: number;
	domainEnabled: number;
	canSend: number;
	canRead: number;
	canReadAttachments: number;
}
export async function apiMailbox(env: Bindings, keyId: string, address: string, scope: Scope) {
	await activeKey(env, keyId);
	const email = emailSchema.parse(address);
	const field = scope === 'mail:send' ? 'canSend' : scope === 'mail:read' ? 'canRead' : 'canReadAttachments';
	const row = await one<ApiMailbox>(
		env,
		`SELECT m.id,m.address,m.name,m.enabled,d.enabled AS domainEnabled,g.canRead,g.canSend,g.canReadAttachments
 FROM mailboxes m JOIN domains d ON d.id=m.domainId JOIN api_key_mailboxes g ON g.mailboxId=m.id
 WHERE g.apiKeyId=? AND m.address=? AND g.${field}=1 ${scope === 'attachment:read' ? 'AND g.canRead=1' : ''}`,
		keyId,
		email,
	);
	if (scope === 'mail:send' && (!row.enabled || !row.domainEnabled)) throw new ApiError(409, 'MAILBOX_DISABLED', '域名或邮箱已停用');
	return row;
}
export async function resolveAddresses(env: Bindings, addresses: string[]) {
	const ids: string[] = [];
	for (const address of addresses) ids.push((await one<{ id: string }>(env, 'SELECT id FROM mailboxes WHERE address=?', address)).id);
	return ids;
}
export const scopesFor = (r: Pick<ApiMailbox, 'canSend' | 'canRead' | 'canReadAttachments'>): Scope[] => [
	...(r.canSend ? ['mail:send' as const] : []),
	...(r.canRead ? ['mail:read' as const] : []),
	...(r.canRead && r.canReadAttachments ? ['attachment:read' as const] : []),
];
export function newSecret() {
	return (
		'ym_' +
		btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=+$/, '')
	);
}
