import * as oidc from 'openid-client';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { Hono } from 'hono';
import { ApiError, db, id, ok, origin, sha, type AppEnv, type Bindings, type Ctx } from './core';
import { users, sessions, loginTransactions } from './schema';
import { emailSchema, normalizeEmail } from '../shared/contracts';
export const SESSION_COOKIE = 'ym_session';
const LOGIN_COOKIE = 'ym_login';
const cookieOptions = { httpOnly: true, secure: true, sameSite: 'Lax' as const, path: '/' };
export function issuer(env: Bindings) {
	const u = new URL(env.SSO_ISSUER || 'https://sso.hocgin.top/api/auth');
	if (u.protocol !== 'https:' || u.pathname !== '/api/auth' || u.search || u.hash || u.username || u.password)
		throw new ApiError(503, 'CONFIGURATION', 'SSO_ISSUER 配置无效');
	return u.href;
}
let cached: { key: string; expires: number; value: Promise<oidc.Configuration> } | undefined;
export async function configuration(env: Bindings) {
	const iss = issuer(env);
	if (!env.SSO_CLIENT_ID || !env.SSO_CLIENT_SECRET || !env.SSO_RESOURCE) throw new ApiError(503, 'CONFIGURATION', '请配置 SSO 客户端');
	const key = JSON.stringify([iss, env.SSO_CLIENT_ID, env.SSO_CLIENT_SECRET]);
	if (!cached || cached.key !== key || cached.expires < Date.now()) {
		const value = oidc
			.discovery(
				new URL(iss),
				env.SSO_CLIENT_ID,
				{ id_token_signed_response_alg: 'RS256' },
				oidc.ClientSecretBasic(env.SSO_CLIENT_SECRET),
				{
					execute: [oidc.enableNonRepudiationChecks],
					[oidc.customFetch]: (input, init) =>
						fetch(input, {
							...init,
							body: init.body instanceof Uint8Array ? new Uint8Array(init.body).buffer : init.body,
							signal: AbortSignal.timeout(10_000),
						}),
				},
			)
			.then((config) => {
				const metadata = config.serverMetadata();
				for (const [name, path] of Object.entries({
					authorization_endpoint: 'oauth2/authorize',
					token_endpoint: 'oauth2/token',
					userinfo_endpoint: 'oauth2/userinfo',
					jwks_uri: 'jwks',
				})) {
					const endpoint = metadata[name];
					if (typeof endpoint !== 'string' || endpoint.replace(/\/$/, '') !== `${iss}/${path}`)
						throw new ApiError(503, 'SSO_METADATA', '认证端点与 issuer 不一致');
				}
				if (!metadata.code_challenge_methods_supported?.includes('S256'))
					throw new ApiError(503, 'SSO_METADATA', '认证中心须支持 PKCE S256');
				return config;
			});
		cached = { key, expires: Date.now() + 300_000, value };
		value.catch(() => {
			if (cached?.value === value) cached = undefined;
		});
	}
	return cached.value;
}
export async function resolveIdentity(env: Bindings, info: { sub: string; email: string; email_verified: boolean }) {
	if (!info.email_verified) throw new ApiError(403, 'EMAIL_UNVERIFIED', '请先在认证中心验证登录邮箱');
	const email = normalizeEmail(info.email),
		iss = issuer(env),
		conn = db(env);
	const bound = await conn
		.select()
		.from(users)
		.where(and(eq(users.issuer, iss), eq(users.subject, info.sub)))
		.get();
	if (bound) {
		await conn.update(users).set({ email, emailVerified: true }).where(eq(users.id, bound.id));
		return { ...bound, email, emailVerified: true };
	}
	const pending = await conn.select().from(users).where(eq(users.email, email)).get();
	if (pending) {
		if (pending.issuer || pending.subject) throw new ApiError(409, 'IDENTITY_CONFLICT', '此邮箱已绑定其他身份，请联系管理员');
		const claimed = await conn
			.update(users)
			.set({ issuer: iss, subject: info.sub, emailVerified: true })
			.where(and(eq(users.id, pending.id), isNull(users.issuer), isNull(users.subject)))
			.returning()
			.get();
		if (!claimed) throw new ApiError(409, 'IDENTITY_CONFLICT', '身份已绑定，请重新登录');
		return claimed;
	}
	return conn
		.insert(users)
		.values({ id: id(), email, issuer: iss, subject: info.sub, emailVerified: true, createdAt: Date.now() })
		.returning()
		.get();
}
export async function authenticate(c: Ctx) {
	const token = getCookie(c, SESSION_COOKIE);
	if (!token) throw new ApiError(401, 'UNAUTHENTICATED', '请先登录');
	const row = await db(c.env)
		.select({ id: users.id, email: users.email, emailVerified: users.emailVerified })
		.from(sessions)
		.innerJoin(users, eq(users.id, sessions.userId))
		.where(and(eq(sessions.hash, await sha(token)), gt(sessions.expiresAt, Date.now())))
		.get();
	if (!row || !row.emailVerified) throw new ApiError(401, 'UNAUTHENTICATED', '登录已过期，请重新登录');
	const adminEmail = emailSchema.safeParse(c.env.ADMIN_EMAIL);
	const user = { ...row, isAdmin: row.emailVerified && adminEmail.success && row.email === adminEmail.data };
	c.set('user', user);
	return user;
}
export const auth = new Hono<AppEnv>();
auth.get('/login', async (c) => {
	const config = await configuration(c.env),
		token = oidc.randomState(),
		state = oidc.randomState(),
		nonce = oidc.randomNonce(),
		verifier = oidc.randomPKCECodeVerifier();
	await db(c.env)
		.insert(loginTransactions)
		.values({
			hash: await sha(token),
			state,
			nonce,
			verifier,
			issuer: issuer(c.env),
			clientId: c.env.SSO_CLIENT_ID,
			resource: c.env.SSO_RESOURCE,
			origin: origin(c.env),
			expiresAt: Date.now() + 600_000,
		});
	setCookie(c, LOGIN_COOKIE, token, { ...cookieOptions, maxAge: 600 });
	return c.redirect(
		oidc.buildAuthorizationUrl(config, {
			response_type: 'code',
			redirect_uri: `${origin(c.env)}/api/auth/callback`,
			scope: 'openid profile email',
			resource: c.env.SSO_RESOURCE,
			state,
			nonce,
			code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
			code_challenge_method: 'S256',
		}).href,
		302,
	);
});
auth.get('/callback', async (c) => {
	const token = getCookie(c, LOGIN_COOKIE);
	deleteCookie(c, LOGIN_COOKIE, cookieOptions);
	if (!token) return c.redirect('/?auth_error=invalid_state', 303);
	// Consume once before the network exchange. Replays never reach the token endpoint.
	const txn = await db(c.env)
		.delete(loginTransactions)
		.where(eq(loginTransactions.hash, await sha(token)))
		.returning()
		.get();
	const params = new URL(c.req.url).searchParams;
	if (
		!txn ||
		txn.expiresAt <= Date.now() ||
		txn.origin !== origin(c.env) ||
		txn.issuer !== issuer(c.env) ||
		txn.clientId !== c.env.SSO_CLIENT_ID ||
		txn.resource !== c.env.SSO_RESOURCE ||
		params.getAll('state').length !== 1 ||
		params.getAll('code').length !== 1 ||
		params.getAll('iss').length !== 1 ||
		params.get('state') !== txn.state ||
		params.get('iss') !== txn.issuer ||
		!params.get('code')
	)
		return c.redirect('/?auth_error=invalid_state', 303);
	try {
		const config = await configuration(c.env),
			callback = new URL('/api/auth/callback', txn.origin);
		callback.search = params.toString();
		const tokens = await oidc.authorizationCodeGrant(
			config,
			callback,
			{ expectedState: txn.state, expectedNonce: txn.nonce, pkceCodeVerifier: txn.verifier, idTokenExpected: true },
			{ resource: txn.resource },
		);
		const claims = tokens.claims();
		if (!claims?.sub) throw new Error('missing subject');
		const info = await oidc.fetchUserInfo(config, tokens.access_token, claims.sub);
		if (typeof info.email !== 'string' || info.email.length > 254) throw new Error('missing email');
		const user = await resolveIdentity(c.env, { sub: info.sub, email: info.email, email_verified: info.email_verified === true });
		const session = oidc.randomState();
		await db(c.env)
			.insert(sessions)
			.values({ hash: await sha(session), userId: user.id, expiresAt: Date.now() + 86_400_000 });
		setCookie(c, SESSION_COOKIE, session, { ...cookieOptions, maxAge: 86400 });
		return c.redirect('/', 303);
	} catch (error) {
		console.warn('oidc_callback_failed', { code: error instanceof ApiError ? error.code : 'SSO_EXCHANGE_FAILED' });
		return c.redirect(`/?auth_error=${error instanceof ApiError ? error.code : 'exchange_failed'}`, 303);
	}
});
auth.post('/logout', async (c) => {
	const token = getCookie(c, SESSION_COOKIE);
	if (token)
		await db(c.env)
			.delete(sessions)
			.where(eq(sessions.hash, await sha(token)));
	deleteCookie(c, SESSION_COOKIE, cookieOptions);
	return c.json(ok(true));
});
