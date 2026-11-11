import { isIP } from 'node:net';
import { ApiError, type Bindings } from './core';
const unsafe = () => new ApiError(400, 'UNSAFE_WEBHOOK_URL', '回调地址必须为公网 HTTPS 地址（端口 443），禁止私网、凭证和重定向');
export function publicIp(ip: string): boolean {
	if (isIP(ip) === 4) {
		const [a, b, c] = ip.split('.').map(Number);
		return !(
			a === 0 ||
			a === 10 ||
			a === 127 ||
			a >= 224 ||
			(a === 169 && b === 254) ||
			(a === 172 && b >= 16 && b <= 31) ||
			(a === 192 && b === 168) ||
			(a === 100 && b >= 64 && b <= 127) ||
			(a === 192 && b === 0) ||
			(a === 192 && b === 88 && c === 99) ||
			(a === 198 && (b === 18 || b === 19)) ||
			(a === 192 && b === 2) ||
			(a === 198 && b === 51 && c === 100) ||
			(a === 203 && b === 0 && c === 113)
		);
	}
	if (isIP(ip) === 6) {
		// Only global unicast; exclude special-purpose 2001::/23, documentation and 6to4.
		const parts = ip.toLowerCase().split(':');
		const first = parseInt(parts[0], 16),
			second = parseInt(parts[1] || '0', 16);
		return (
			first >= 0x2000 &&
			first <= 0x3fff &&
			!(first === 0x2001 && (second < 0x200 || second === 0xdb8)) &&
			first !== 0x2002 &&
			!(first === 0x3fff && second < 0x1000)
		);
	}
	return false;
}
export function webhookUrl(value: string) {
	let u: URL;
	try {
		u = new URL(value);
	} catch {
		throw unsafe();
	}
	const host = u.hostname.replace(/^\[|\]$/g, '').toLowerCase();
	if (
		u.protocol !== 'https:' ||
		(u.port && u.port !== '443') ||
		u.username ||
		u.password ||
		u.hash ||
		!host ||
		host.endsWith('.') ||
		host === 'localhost' ||
		/\.(localhost|local|internal|test|invalid|onion)$/.test(host)
	)
		throw unsafe();
	if (isIP(host)) {
		if (!publicIp(host)) throw unsafe();
	} else if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(host)) throw unsafe();
	return u;
}
export async function validateWebhookTarget(value: string) {
	const url = webhookUrl(value),
		host = url.hostname.replace(/^\[|\]$/g, '');
	if (isIP(host)) return url;
	// This preflight is defense in depth. The production global fetch uses Cloudflare's
	// public-only egress, not a private origin/VPC binding, so a subsequent DNS change
	// cannot grant access to a private origin. Never replace this with a bound fetcher.
	const answers = await Promise.all(
		['A', 'AAAA'].map(async (type) => {
			const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=${type}`, {
				headers: { Accept: 'application/dns-json' },
				redirect: 'error',
				signal: AbortSignal.timeout(5000),
			});
			if (!res.ok) throw new ApiError(503, 'DNS_UNAVAILABLE', '无法验证回调域名');
			const data = await res.json<{ Status: number; Answer?: { type: number; data: string }[] }>();
			if (![0, 3].includes(data.Status)) throw new ApiError(503, 'DNS_UNAVAILABLE', '无法验证回调域名');
			return (data.Answer || []).filter((a) => a.type === 1 || a.type === 28).map((a) => a.data);
		}),
	);
	const ips = answers.flat();
	if (!ips.length || ips.some((ip) => !publicIp(ip))) throw unsafe();
	return url;
}
const encode = (v: Uint8Array) => btoa(String.fromCharCode(...v));
const decode = (v: string) => Uint8Array.from(atob(v), (c) => c.charCodeAt(0));
async function masterKey(env: Bindings) {
	let bytes: Uint8Array<ArrayBuffer>;
	try {
		bytes = decode(env.WEBHOOK_MASTER_KEY || '');
	} catch {
		throw new ApiError(503, 'WEBHOOK_CONFIGURATION', 'Webhook 加密主密钥未配置');
	}
	if (bytes.length !== 32) throw new ApiError(503, 'WEBHOOK_CONFIGURATION', 'Webhook 加密主密钥必须为 32 字节 Base64');
	return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function encryptSecret(env: Bindings, secret: string) {
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const result = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode('yourself-webhook-v1') },
		await masterKey(env),
		new TextEncoder().encode(secret),
	);
	return `v1.${encode(iv)}.${encode(new Uint8Array(result))}`;
}
export async function decryptSecret(env: Bindings, value: string) {
	const [version, iv, body] = value.split('.');
	if (version !== 'v1') throw new Error('Unsupported webhook secret version');
	return new TextDecoder().decode(
		await crypto.subtle.decrypt(
			{ name: 'AES-GCM', iv: decode(iv), additionalData: new TextEncoder().encode('yourself-webhook-v1') },
			await masterKey(env),
			decode(body),
		),
	);
}
export async function signWebhook(secret: string, timestamp: string, eventId: string, body: string) {
	const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
	const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${eventId}.${body}`));
	return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
// Receiver reference implementation. A persistent eventId deduplication store is still required.
export async function verifyWebhook(secret: string, timestamp: string, eventId: string, body: string, signature: string, now = Date.now()) {
	if (!/^\d{10,}$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > 300 || !/^v1=[a-f0-9]{64}$/.test(signature)) return false;
	const expected = `v1=${await signWebhook(secret, timestamp, eventId, body)}`;
	let diff = 0;
	for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
	return diff === 0;
}
