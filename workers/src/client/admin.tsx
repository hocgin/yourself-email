import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Globe, Inbox, Users, ShieldCheck, ExternalLink } from 'lucide-react';
import type { Identity } from '../shared/contracts';
import { CoreAdmin } from './admin-core';
import { AdminConfirm, AdminDirtyContext } from './admin-components';
const ExternalAdmin = lazy(() => import('./external-admin').then((module) => ({ default: module.ExternalAdmin })));
export function AdminApp({ user, refresh }: { user: Identity; refresh: () => Promise<void> }) {
	const { tab } = useParams();
	const navigate = useNavigate();
	const [dirty, setDirty] = useState(false),
		[destination, setDestination] = useState<string | null>(null);
	const external = ['api-keys', 'templates', 'webhooks', 'api-call-logs'].includes(tab || '');
	const active = external ? tab! : tab === 'mailboxes' ? 'mailboxes' : tab === 'accounts' ? 'accounts' : 'domains';
	useEffect(() => {
		document.querySelector('.admin-nav .folder.active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
	}, [active]);
	return (
		<AdminDirtyContext.Provider value={setDirty}>
			<div className="admin-shell">
				<aside className="admin-nav">
					<span className="eyebrow">ADMINISTRATION</span>
					<h2>管理后台</h2>
					{[
						{ id: 'domains', label: '邮箱域名', icon: Globe },
						{ id: 'mailboxes', label: '邮箱管理', icon: Inbox },
						{ id: 'accounts', label: '账号授权', icon: Users },
						{ id: 'api-keys', label: 'API 密钥', icon: ShieldCheck },
						{ id: 'templates', label: '邮件模板', icon: Inbox },
						{ id: 'webhooks', label: 'Webhook', icon: ExternalLink },
						{ id: 'api-call-logs', label: 'API 调用日志', icon: Users },
					].map((item) => (
						<Link
							key={item.id}
							to={`/admin/${item.id}`}
							className={`folder ${active === item.id ? 'active' : ''}`}
							onClick={(event) => {
								if (dirty && active !== item.id) {
									event.preventDefault();
									setDestination(`/admin/${item.id}`);
								}
							}}
						>
							<item.icon size={18} />
							{item.label}
						</Link>
					))}
					<div className="admin-identity">
						<ShieldCheck size={18} />
						<strong>唯一管理员</strong>
						<span>{user.email}</span>
						<small>
							已验证的 SSO 身份
							<br />
							可管理及收发全部邮箱
						</small>
					</div>
				</aside>
				<main className={`admin-main ${active === 'templates' ? 'admin-main-templates' : 'admin-main-workspace'}`}>
					{external ? (
						<Suspense
							fallback={
								<p className="workspace-loading" role="status">
									加载管理页面…
								</p>
							}
						>
							<ExternalAdmin key={active} tab={active} />
						</Suspense>
					) : (
						<CoreAdmin key={active} page={active} adminEmail={user.email} refresh={refresh} />
					)}
				</main>
			</div>
			<AdminConfirm
				open={!!destination}
				title="离开当前页面？"
				description="当前修改尚未保存。离开后，这些修改将丢失。"
				confirm="放弃修改并离开"
				onCancel={() => setDestination(null)}
				onConfirm={() => {
					if (destination) navigate(destination);
					setDestination(null);
					setDirty(false);
				}}
			/>
		</AdminDirtyContext.Provider>
	);
}
