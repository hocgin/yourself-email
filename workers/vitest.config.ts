import { defineConfig } from 'vitest/config';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
export default defineConfig({
	cacheDir: 'node_modules/.vite-test',
	plugins: [
		cloudflareTest({
			miniflare: {
				compatibilityDate: '2026-11-10',
				compatibilityFlags: ['nodejs_compat', 'global_fetch_strictly_public'],
				d1Databases: ['DB'],
				r2Buckets: ['MAIL_STORAGE'],
				bindings: {
					APP_URL: 'https://mail.example.test',
					ADMIN_EMAIL: 'admin@example.test',
					SSO_ISSUER: 'https://sso.hocgin.top/api/auth',
					SSO_CLIENT_ID: 'test-client',
					SSO_CLIENT_SECRET: 'test-secret',
					SSO_RESOURCE: 'urn:mail:test',
					WEBHOOK_MASTER_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
				},
			},
		}),
	],
	test: {
		deps: { optimizer: { ssr: { enabled: true, include: ['sanitize-html'] } } },
		include: ['test/**/*.test.ts'],
		setupFiles: ['test/setup.ts'],
		fileParallelism: false,
		provide: { migrations: await readD1Migrations('./migrations') },
	},
});
