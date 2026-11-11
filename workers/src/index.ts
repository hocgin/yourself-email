import { enqueueDue, processWebhookQueue } from './server/webhooks';
import app from './server/app';
import { receiveEmail } from './server/inbound';
import { cleanup } from './server/maintenance';
import type { Bindings } from './server/core';
export default {
	fetch: app.fetch,
	queue: processWebhookQueue,
	email: receiveEmail,
	async scheduled(_event: ScheduledController, env: Bindings, ctx: ExecutionContext) {
		ctx.waitUntil(Promise.all([enqueueDue(env), ...(new Date(_event.scheduledTime).getUTCMinutes() === 17 ? [cleanup(env)] : [])]));
	},
} satisfies ExportedHandler<Bindings>;
