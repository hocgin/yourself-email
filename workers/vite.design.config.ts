import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
// The design preview runs the real UI with local fixtures, without Cloudflare bindings.
export default defineConfig({
	plugins: [react(), tailwindcss()],
	cacheDir: 'node_modules/.vite-design',
	server: { port: 5174, host: '127.0.0.1' },
});
