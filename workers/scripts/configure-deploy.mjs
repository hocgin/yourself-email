import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';
import { z } from 'zod';
const required = ['ADMIN_EMAIL', 'APP_URL', 'D1_DATABASE_ID', 'R2_BUCKET_NAME', 'SSO_CLIENT_ID', 'SSO_RESOURCE'];
for (const key of required) if (!process.env[key]) throw new Error(`Missing deployment variable: ${key}`);
const app = new URL(process.env.APP_URL);
if (app.protocol !== 'https:' || app.pathname !== '/' || app.search || app.hash || app.username || app.password)
	throw new Error('APP_URL must be an HTTPS origin');
if (!/^[0-9a-f-]{36}$/i.test(process.env.D1_DATABASE_ID) || /^0{8}-/.test(process.env.D1_DATABASE_ID))
	throw new Error('Use a real NEW v2 D1 database ID');
const path = new URL('../wrangler.jsonc', import.meta.url),
	parsed = ts.parseConfigFileTextToJson(path.pathname, await readFile(path, 'utf8'));
if (parsed.error) throw new Error('Invalid Wrangler JSONC configuration');
const config = parsed.config;
config.vars = {
	APP_URL: app.origin,
	ADMIN_EMAIL: z.string().trim().toLowerCase().email().max(254).parse(process.env.ADMIN_EMAIL),
	SSO_ISSUER: process.env.SSO_ISSUER || 'https://sso.hocgin.top/api/auth',
	SSO_CLIENT_ID: process.env.SSO_CLIENT_ID,
	SSO_RESOURCE: process.env.SSO_RESOURCE,
};
config.d1_databases[0].database_id = process.env.D1_DATABASE_ID;
config.r2_buckets[0].bucket_name = process.env.R2_BUCKET_NAME;
await writeFile(path, JSON.stringify(config, null, 2) + '\n');
console.log('Deployment configuration prepared; secrets are not written to Wrangler config.');
