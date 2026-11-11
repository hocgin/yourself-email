import { Templates } from './templates';
import { ApiKeys, ApiLogs, WebhookManager } from './admin-integrations';
import { useAdminList } from './admin-components';
import { Notice } from './ui';
export function ExternalAdmin({ tab }: { tab: string }) {
	const boxes = useAdminList<{ address: string }>('/admin/mailboxes');
	if (tab === 'templates')
		return (
			<section className="external-admin">
				{boxes.error && <Notice error>{boxes.error}</Notice>}
				<Templates boxes={boxes.items} />
			</section>
		);
	if (tab === 'api-keys') return <ApiKeys boxes={boxes.items} boxesLoading={boxes.loading} boxError={boxes.error} />;
	if (tab === 'webhooks') return <WebhookManager boxes={boxes.items} boxesLoading={boxes.loading} boxError={boxes.error} />;
	return <ApiLogs />;
}
