import { openApi } from './open-api';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { ZodError } from 'zod';
import { ApiError, ok, origin, type AppEnv } from './core';
import { auth, authenticate } from './auth';
import { admin } from './admin';
import { mailRoutes, fileRoutes } from './messages';
import { listMailboxes } from './permissions';
export const app = new Hono<AppEnv>();
app.use('*', async (c, next) => {
	c.header('X-Content-Type-Options', 'nosniff');
	c.header('Referrer-Policy', 'no-referrer');
	c.header('X-Frame-Options', 'DENY');
	if (c.req.path.startsWith('/api/')) {
		c.header('Cache-Control', 'no-store');
		if (
			!(c.req.path === '/api/open/v1' || c.req.path.startsWith('/api/open/v1/')) &&
			!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method) &&
			c.req.header('Origin') !== origin(c.env)
		)
			throw new ApiError(403, 'INVALID_ORIGIN', '请求来源无效');
	}
	await next();
});
const browserBodyLimit = bodyLimit({
	maxSize: 20 * 1024 * 1024,
	onError: () => {
		throw new ApiError(413, 'REQUEST_TOO_LARGE', '请求内容过大');
	},
});
app.use('/api/*', async (c, next) => {
	if (c.req.path === '/api/open/v1' || c.req.path.startsWith('/api/open/v1/')) await next();
	else await browserBodyLimit(c, next);
});
app.get('/health', (c) => c.json({ status: 'ok' }));
app.route('/api/auth', auth);
app.route('/api/open/v1', openApi);
app.use('/api/*', async (c, next) => {
	await authenticate(c);
	await next();
});
app.get('/api/me', (c) => c.json(ok(c.get('user'))));
app.get('/api/mailboxes', async (c) => c.json(ok(await listMailboxes(c.env, c.get('user')))));
app.route('/api/admin', admin);
app.route('/api/messages', mailRoutes);
app.route('/api/attachments', fileRoutes);
app.all('/api/*', () => {
	throw new ApiError(404, 'NOT_FOUND', '接口不存在');
});
app.get('/sw.js', async (c) => {
	const res = await c.env.ASSETS.fetch(c.req.raw);
	const headers = new Headers(res.headers);
	headers.set('Cache-Control', 'no-store');
	headers.set('Service-Worker-Allowed', '/');
	return new Response(res.body, { status: res.status, headers });
});
app.get('*', async (c) => {
	const res = await c.env.ASSETS.fetch(c.req.raw);
	const headers = new Headers(res.headers);
	// Sandboxed mail bodies use about:srcdoc; keep frame-ancestors and the iframe sandbox intact.
	headers.set(
		'Content-Security-Policy',
		`default-src 'self'; script-src ${import.meta.env.DEV ? "'self' 'unsafe-inline'" : "'self'"}; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self' data:; frame-src 'self' blob: about:; connect-src 'self' ${import.meta.env.DEV ? 'ws: wss:' : ''}; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`,
	);
	return new Response(res.body, { status: res.status, headers });
});
app.onError((error, c) => {
	if (error instanceof ApiError) return c.json({ error: { code: error.code, message: error.message } }, error.status);
	if (error instanceof ZodError)
		return c.json(
			{ error: { code: 'VALIDATION_ERROR', message: error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') } },
			400,
		);
	if (error instanceof SyntaxError) return c.json({ error: { code: 'INVALID_JSON', message: 'JSON 格式无效' } }, 400);
	console.error('request_failed', { path: c.req.path, type: error.name });
	return c.json({ error: { code: 'INTERNAL_ERROR', message: '服务暂不可用，请稍后重试' } }, 500);
});
export default app;
