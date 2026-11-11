import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { testEnv, seed, request, admin, reader } from './helpers';
import { db, sha } from '../src/server/core';
import { loginTransactions, sessions, users } from '../src/server/schema';
import { resolveIdentity } from '../src/server/auth';
const issuer = 'https://sso.hocgin.top/api/auth';
function base64url(input: Uint8Array | string) {
	const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
	let s = '';
	for (const b of bytes) s += String.fromCharCode(b);
	return btoa(s).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
let nonce = 'nonce',
	wrongNonce = false,
	wrongIssuer = false,
	tampered = false,
	expired = false,
	wrongSubject = false,
	verified = true,
	userEmail = 'new@example.test',
	pair: CryptoKeyPair,
	jwk: JsonWebKey;
async function sign() {
	const now = Math.floor(Date.now() / 1000),
		head = base64url(JSON.stringify({ alg: 'RS256', kid: 'test-key', typ: 'JWT' })),
		body = base64url(
			JSON.stringify({
				iss: wrongIssuer ? 'https://evil.test' : issuer,
				sub: 'sso-user',
				aud: 'test-client',
				iat: now,
				exp: expired ? now - 900 : now + 900,
				nonce: wrongNonce ? 'wrong' : nonce,
			}),
		);
	const data = `${head}.${body}`,
		signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', pair.privateKey, new TextEncoder().encode(data));
	const signatureBytes = new Uint8Array(signature);
	if (tampered) signatureBytes[0] ^= 255;
	return `${data}.${base64url(signatureBytes)}`;
}
async function mockOidc() {
	if (!pair)
		pair = await crypto.subtle.generateKey(
			{ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
			true,
			['sign', 'verify'],
		);
	jwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
	vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
		const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
		if (url.endsWith('/.well-known/openid-configuration'))
			return Response.json({
				issuer,
				authorization_endpoint: `${issuer}/oauth2/authorize`,
				token_endpoint: `${issuer}/oauth2/token`,
				userinfo_endpoint: `${issuer}/oauth2/userinfo`,
				jwks_uri: `${issuer}/jwks`,
				response_types_supported: ['code'],
				subject_types_supported: ['public'],
				id_token_signing_alg_values_supported: ['RS256'],
				code_challenge_methods_supported: ['S256'],
				token_endpoint_auth_methods_supported: ['client_secret_basic'],
			});
		if (url.endsWith('/jwks')) return Response.json({ keys: [{ ...jwk, kid: 'test-key', alg: 'RS256', use: 'sig' }] });
		if (url.endsWith('/oauth2/token'))
			return Response.json({ access_token: 'access-token', token_type: 'Bearer', expires_in: 900, id_token: await sign() });
		if (url.endsWith('/oauth2/userinfo'))
			return Response.json({ sub: wrongSubject ? 'different-sub' : 'sso-user', email: userEmail, email_verified: verified });
		throw new Error(`Unexpected fetch ${url}`);
	});
}
async function transaction(state = 'state') {
	const hash = await sha('login-token');
	await db(testEnv())
		.insert(loginTransactions)
		.values({
			hash,
			state,
			nonce,
			verifier: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRS',
			issuer,
			clientId: 'test-client',
			resource: 'urn:mail:test',
			origin: 'https://mail.example.test',
			expiresAt: Date.now() + 600000,
		});
	return `/api/auth/callback?code=code&state=${state}&iss=${encodeURIComponent(issuer)}`;
}
describe('OIDC with real signed ID tokens', () => {
	beforeEach(async () => {
		await seed();
		nonce = crypto.randomUUID();
		wrongNonce = false;
		wrongIssuer = false;
		tampered = false;
		expired = false;
		wrongSubject = false;
		verified = true;
		userEmail = 'new@example.test';
		await mockOidc();
	});
	afterEach(() => vi.restoreAllMocks());
	it('uses authorization code, S256, nonce, resource and secure transaction cookie', async () => {
		const res = await request('/api/auth/login', null);
		expect(res.status).toBe(302);
		const url = new URL(res.headers.get('location')!);
		expect(url.searchParams.get('code_challenge_method')).toBe('S256');
		expect(url.searchParams.get('scope')).toBe('openid profile email');
		expect(url.searchParams.get('resource')).toBe('urn:mail:test');
		expect(url.searchParams.get('nonce')).toBeTruthy();
		expect(res.headers.get('set-cookie')).toContain('HttpOnly');
		expect(res.headers.get('set-cookie')).toContain('Secure');
	});
	it('validates signature and userinfo then creates a 24-hour server session', async () => {
		const res = await request(await transaction(), null, 'GET', undefined, { Cookie: 'ym_login=login-token' });
		expect(res.headers.get('location')).toBe('/');
		expect(res.headers.get('set-cookie')).toContain('ym_session=');
		const rows = await db(testEnv()).select().from(sessions);
		expect(rows.some((s) => s.expiresAt > Date.now() + 86300000)).toBe(true);
		expect((await db(testEnv()).select().from(users).where(eq(users.email, 'new@example.test')).get())?.subject).toBe('sso-user');
	});
	it.each(['signature', 'expiry', 'subject'] as const)('rejects invalid identity proof %s', async (kind) => {
		tampered = kind === 'signature';
		expired = kind === 'expiry';
		wrongSubject = kind === 'subject';
		const res = await request(await transaction(), null, 'GET', undefined, { Cookie: 'ym_login=login-token' });
		expect(res.headers.get('location')).toContain('exchange_failed');
	});
	it('rejects expired login transactions', async () => {
		const path = await transaction();
		await db(testEnv()).update(loginTransactions).set({ expiresAt: 0 });
		const res = await request(path, null, 'GET', undefined, { Cookie: 'ym_login=login-token' });
		expect(res.headers.get('location')).toContain('invalid_state');
	});
	it('rejects state mismatch and consumes the transaction', async () => {
		const path = await transaction();
		const res = await request(path.replace('state=state', 'state=evil'), null, 'GET', undefined, { Cookie: 'ym_login=login-token' });
		expect(res.headers.get('location')).toContain('invalid_state');
		expect(await db(testEnv()).select().from(loginTransactions)).toHaveLength(0);
	});
	it.each(['nonce', 'issuer'] as const)('rejects wrong ID token %s', async (field) => {
		if (field === 'nonce') wrongNonce = true;
		else wrongIssuer = true;
		const res = await request(await transaction(), null, 'GET', undefined, { Cookie: 'ym_login=login-token' });
		expect(res.headers.get('location')).toContain('exchange_failed');
	});
	it('rejects a mismatched authorization response issuer before exchange', async () => {
		const path = await transaction();
		const res = await request(
			path.replace(encodeURIComponent(issuer), encodeURIComponent('https://evil.test/api/auth')),
			null,
			'GET',
			undefined,
			{ Cookie: 'ym_login=login-token' },
		);
		expect(res.headers.get('location')).toContain('invalid_state');
	});
	it('rejects replay of a consumed callback', async () => {
		const path = await transaction();
		await request(path, null, 'GET', undefined, { Cookie: 'ym_login=login-token' });
		const res = await request(path, null, 'GET', undefined, { Cookie: 'ym_login=login-token' });
		expect(res.headers.get('location')).toContain('invalid_state');
	});
	it('requires verified email including the administrator address', async () => {
		verified = false;
			userEmail = 'admin@example.test';
		const res = await request(await transaction(), null, 'GET', undefined, { Cookie: 'ym_login=login-token' });
		expect(res.headers.get('location')).toContain('EMAIL_UNVERIFIED');
	});
	it('binds preassigned grants to a stable identity and prevents email takeover', async () => {
		const user = await resolveIdentity(testEnv(), { sub: 'reader-sub', email: reader.email, email_verified: true });
		expect(user.id).toBe(reader.id);
		await expect(resolveIdentity(testEnv(), { sub: 'other-sub', email: reader.email, email_verified: true })).rejects.toThrow(
			'已绑定其他身份',
		);
	});
	it('expires and revokes business sessions on logout', async () => {
		await db(testEnv()).update(sessions).set({ expiresAt: 0 }).where(eq(sessions.userId, reader.id));
		expect((await request('/api/me', reader)).status).toBe(401);
		expect((await request('/api/auth/logout', admin, 'POST')).status).toBe(200);
		expect((await request('/api/me', admin)).status).toBe(401);
	});
});


describe('environment-configured administrator', () => {
	beforeEach(seed);
	it('moves global access to the configured verified account on existing sessions', async () => {
		const bindings = { ...testEnv(), ADMIN_EMAIL: '  READER@EXAMPLE.TEST  ' };
		const newAdmin = await request('/api/me', reader, 'GET', undefined, {}, bindings);
		expect((await newAdmin.json() as { data: { isAdmin: boolean } }).data.isAdmin).toBe(true);
		expect((await request('/api/admin/domains', reader, 'GET', undefined, {}, bindings)).status).toBe(200);
		const oldAdmin = await request('/api/me', admin, 'GET', undefined, {}, bindings);
		expect((await oldAdmin.json() as { data: { isAdmin: boolean } }).data.isAdmin).toBe(false);
		expect((await request('/api/admin/domains', admin, 'GET', undefined, {}, bindings)).status).toBe(403);
		const boxes = await request('/api/mailboxes', admin, 'GET', undefined, {}, bindings);
		expect((await boxes.json() as { data: unknown[] }).data).toHaveLength(0);
	});
	it.each([undefined, '', ' ', 'invalid', 'admin@example.test,reader@example.test'])(
		'grants no administrator access for invalid configuration %s',
		async (ADMIN_EMAIL) => {
			const bindings = { ...testEnv(), ADMIN_EMAIL };
			const res = await request('/api/me', admin, 'GET', undefined, {}, bindings);
			expect((await res.json() as { data: { isAdmin: boolean } }).data.isAdmin).toBe(false);
			expect((await request('/api/admin/domains', admin, 'GET', undefined, {}, bindings)).status).toBe(403);
		},
	);
	it('requires a verified session even when its email matches the configuration', async () => {
		await db(testEnv()).update(users).set({ emailVerified: false }).where(eq(users.id, reader.id));
		const bindings = { ...testEnv(), ADMIN_EMAIL: reader.email };
		expect((await request('/api/me', reader, 'GET', undefined, {}, bindings)).status).toBe(401);
		expect((await request('/api/admin/domains', reader, 'GET', undefined, {}, bindings)).status).toBe(401);
	});
});
