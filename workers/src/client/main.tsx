import React, { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Button, Dropdown, Label } from '@heroui/react';
import { LogOut, Shield, ArrowLeft, ChevronDown, UserRound } from 'lucide-react';
import { api, errorText, HttpError } from './api';
import { Brand, Empty, Notice } from './ui';
import { MailboxApp } from './mail';
import { AdminApp } from './admin';
import type { Identity, Mailbox } from '../shared/contracts';
import './styles.css';
import './mail.css';
function App() {
	const [user, setUser] = useState<Identity | null>(null),
		[boxes, setBoxes] = useState<Mailbox[]>([]),
		[loading, setLoading] = useState(true),
		[error, setError] = useState('');
	const location = useLocation();
	const navigate = useNavigate();
	const refresh = useCallback(async () => {
		try {
			const identity = await api<Identity>('/me');
			setUser(identity);
			setBoxes(await api<Mailbox[]>('/mailboxes'));
			setError('');
		} catch (e) {
			if (e instanceof HttpError && e.status === 401) {
				setUser(null);
				setBoxes([]);
			} else setError(errorText(e));
		} finally {
			setLoading(false);
		}
	}, []);
	useEffect(() => {
		void refresh();
		const timer = setInterval(() => void refresh(), 30_000);
		return () => clearInterval(timer);
	}, [refresh]);
	if (loading)
		return (
			<div className="login-wrap">
				<Brand />
				<p className="muted">正在连接邮件空间…</p>
			</div>
		);
	if (!user)
		return (
			<div className="login-page">
				<div className="login-card">
					<Brand />
					<span className="eyebrow">YOUR MAIL, YOUR SPACE</span>
					<h1>
						每个地址，
						<br />
						都有自己的归属。
					</h1>
					<p>
						一个账号，管理多个域名下的邮箱。
						<br />
						安全登录，回到你的邮件空间。
					</p>
					{new URLSearchParams(location.search).has('auth_error') && (
						<Notice error>登录未完成，请重试。请确认邮箱已验证；如持续失败，请联系管理员检查 SSO 配置。</Notice>
					)}
					{error && <Notice error>{error}</Notice>}
					<Button size="lg" onPress={() => window.location.assign('/api/auth/login')}>
						去登录 <span aria-hidden>↗</span>
					</Button>
					<small>邮箱由管理员分配 · 登录后即可访问已授权邮箱</small>
				</div>
				<div className="login-art" aria-hidden>
					<img className="login-art-image" src="/images/login-mailbox-sanctuary-v2.webp" alt="" fetchPriority="high" />
					<span>让沟通有序发生。</span>
				</div>
			</div>
		);
	return (
		<div className="app">
			<header className="app-header">
				<Link to="/" aria-label="返回邮箱">
					<Brand />
				</Link>
				<div className="header-right">
					{user.isAdmin && location.pathname.startsWith('/admin') && (
						<Link className="header-link" to={location.pathname.startsWith('/admin') ? '/' : '/admin/domains'}>
							{location.pathname.startsWith('/admin') ? <ArrowLeft size={15} /> : <Shield size={15} />}
							<span>{location.pathname.startsWith('/admin') ? '返回邮箱' : '管理后台'}</span>
						</Link>
					)}
					<Dropdown>
						<Button size="sm" variant="ghost" className="account-trigger" aria-label={`账户菜单：${user.email}`}>
							<span className="user-email">{user.email}</span>
							<ChevronDown size={14} className="account-chevron" />
							<span className="account-avatar">
								<UserRound size={17} />
							</span>
						</Button>
						<Dropdown.Popover placement="bottom end">
							<Dropdown.Menu aria-label="账户菜单">
								<Dropdown.Section>
									<Dropdown.Item id="identity" textValue={user.email} isDisabled>
										<Label>{user.email}</Label>
									</Dropdown.Item>
								</Dropdown.Section>
								{user.isAdmin && (
									<Dropdown.Item id="admin" onAction={() => navigate('/admin/domains')} textValue="管理后台">
										<Shield size={16} />
										<Label>管理后台</Label>
									</Dropdown.Item>
								)}
								<Dropdown.Item
									id="logout"
									textValue="退出登录"
									onAction={() =>
										void api('/auth/logout', { method: 'POST' })
											.then(() => {
												setUser(null);
												setBoxes([]);
											})
											.catch((e) => setError(errorText(e)))
									}
								>
									<LogOut size={16} />
									<Label>退出登录</Label>
								</Dropdown.Item>
							</Dropdown.Menu>
						</Dropdown.Popover>
					</Dropdown>
				</div>
			</header>
			{error && <Notice error>{error}</Notice>}
			<Routes>
				<Route
					path="/admin/:tab"
					element={user.isAdmin ? <AdminApp user={user} refresh={refresh} /> : <Empty title="无管理权限" description="只有管理员可以访问此页面。" />}
				/>
				<Route path="*" element={<MailboxApp user={user} boxes={boxes} refresh={refresh} />} />
			</Routes>
		</div>
	);
}
// Install the retirement worker once; it unregisters itself after evicting legacy caches.
if ('serviceWorker' in navigator && navigator.serviceWorker.controller)
	void navigator.serviceWorker
		.register('/sw.js', { updateViaCache: 'none' })
		.then((r) => r.update())
		.catch(() => {});
// Reuse the mounted root during Vite hot updates.
const root = (import.meta.hot?.data.root as ReturnType<typeof createRoot> | undefined) ?? createRoot(document.getElementById('root')!);
if (import.meta.hot) import.meta.hot.data.root = root;
async function start() {
	if (import.meta.env.DEV && new URLSearchParams(location.search).get('preview') === 'design') {
		const { startDesignPreview } = await import('./design-preview');
		startDesignPreview();
	}
	root.render(
		<React.StrictMode>
			<BrowserRouter>
				<App />
			</BrowserRouter>
		</React.StrictMode>,
	);
}
void start();
