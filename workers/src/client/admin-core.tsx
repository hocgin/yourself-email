import { useState } from 'react';
import { Button } from '@heroui/react';
import { ExternalLink, Globe } from 'lucide-react';
import { api, json } from './api';
import { Check } from './ui';
import {
	AdminBadge,
	AdminEmpty,
	AdminField,
	AdminHeader,
	AdminInspector,
	AdminSearch,
	AdminStatus,
	EnabledBadge,
	NewButton,
	useAdminEditor,
	useAdminList,
	useAdminTask,
} from './admin-components';
import type { AccountGrant, Domain } from '../shared/contracts';
export interface AdminMailbox {
	id: string;
	address: string;
	name: string;
	enabled: boolean;
	domainId: string;
}
export function CoreAdmin({ page, adminEmail, refresh }: { page: string; adminEmail: string; refresh: () => Promise<void> }) {
	return page === 'mailboxes' ? (
		<MailboxManager refresh={refresh} />
	) : page === 'accounts' ? (
		<AccountManager adminEmail={adminEmail} refresh={refresh} />
	) : (
		<DomainManager refresh={refresh} />
	);
}
function DomainManager({ refresh }: { refresh: () => Promise<void> }) {
	const list = useAdminList<Domain>('/admin/domains'),
		boxes = useAdminList<AdminMailbox>('/admin/mailboxes'),
		task = useAdminTask();
	const editor = useAdminEditor({ id: '', name: '', enabled: true });
	const [search, setSearch] = useState('');
	const filtered = list.items.filter((row) => row.name.toLowerCase().includes(search.toLowerCase()));
	async function save() {
		await task.run(async () => {
			const d = editor.draft;
			await api(
				d.id ? `/admin/domains/${d.id}` : '/admin/domains',
				json(d.id ? 'PATCH' : 'POST', d.id ? { enabled: d.enabled } : { name: d.name.trim(), enabled: d.enabled }),
			);
			editor.finish();
			await Promise.all([list.reload(), refresh()]);
		});
	}
	return (
		<div className="admin-workspace">
			<AdminHeader
				title="邮箱域名"
				description="连接多个域名，让每个邮箱地址各司其职。"
				busy={task.busy || list.loading}
				onRefresh={() => void task.run(list.reload, '列表已刷新')}
				action={
					<NewButton onPress={() => editor.begin({ id: '', name: '', enabled: true })} disabled={task.busy}>
						添加域名
					</NewButton>
				}
			/>
			<AdminStatus error={task.error || list.error || boxes.error} notice={task.notice} />
			<div className={`workspace-split ${editor.open ? 'has-inspector' : ''}`}>
				<section className="workspace-list">
					<div className="workspace-filters">
						<AdminSearch value={search} onChange={setSearch} placeholder="搜索域名" />
					</div>
					<div className="workspace-table" role="region" aria-label="数据列表，可横向滚动" tabIndex={0}>
						<table>
							<thead>
								<tr>
									<th>域名</th>
									<th>邮箱数量</th>
									<th>业务状态</th>
									<th>操作</th>
								</tr>
							</thead>
							<tbody>
								{filtered.map((row) => (
									<tr key={row.id} className={editor.open && editor.draft.id === row.id ? 'is-selected' : ''}>
										<td>
											<strong>{row.name}</strong>
										</td>
										<td>{boxes.loading ? '—' : boxes.items.filter((b) => b.domainId === row.id).length}</td>
										<td>
											<EnabledBadge enabled={row.enabled} />
										</td>
										<td>
											<Button
												size="sm"
												variant="secondary"
												isDisabled={task.busy}
												onPress={() => editor.begin({ id: row.id, name: row.name, enabled: !!row.enabled })}
												aria-label={`编辑域名 ${row.name}`}
											>
												编辑
											</Button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					{(!filtered.length || list.loading) && (
						<AdminEmpty
							loading={list.loading}
							filtered={!!search}
							title="添加第一个域名"
							description="完成 Cloudflare 接入后，添加域名即可创建邮箱。"
							onRetry={list.error ? () => void task.run(list.reload) : undefined}
						/>
					)}
					<details className="workspace-guide">
						<summary>
							<Globe size={17} />在 Cloudflare 完成域名接入
						</summary>
						<ol>
							<li>将域名 DNS 托管至 Cloudflare。</li>
							<li>在 Email Service → Email Sending 中接入域名，完成 SPF、DKIM 和 DMARC 配置。</li>
							<li>在 Email Routing 中将 Catch-all 指向本项目 Worker。</li>
							<li>添加域名与邮箱，并为账号配置读取和发送权限。</li>
						</ol>
						<a href="https://developers.cloudflare.com/email-service/get-started/send-emails/" target="_blank" rel="noreferrer">
							查看 Cloudflare 接入文档 <ExternalLink size={13} />
						</a>
					</details>
					<p className="workspace-footnote">
						业务启用不代表 Cloudflare 验证通过。启用域名的未创建地址可在首次来信时自动建箱，默认仅管理员可访问。
					</p>
				</section>
				{editor.open && (
					<AdminInspector
						title={editor.draft.id ? '编辑域名' : '添加域名'}
						onClose={editor.close}
						onSave={save}
						busy={task.busy}
						saveDisabled={!!editor.draft.id && !editor.dirty}
						saveLabel={editor.draft.id ? '保存修改' : '添加域名'}
					>
						<AdminField label="域名" hint={editor.draft.id ? '域名创建后不可修改。' : '请填写已在 Cloudflare 完成接入的域名。'}>
							<input
								required
								value={editor.draft.name}
								readOnly={!!editor.draft.id}
								placeholder="example.com"
								onChange={(e) => editor.setDraft({ ...editor.draft, name: e.target.value })}
							/>
						</AdminField>
						<Check label="启用域名" value={editor.draft.enabled} onChange={(enabled) => editor.setDraft({ ...editor.draft, enabled })} />
						<p className="workspace-help">停用会停止此域名下邮箱的收发，历史邮件会保留。</p>
						<p className="workspace-help">此开关管理应用内状态，不会修改 Cloudflare 的 DNS 或验证配置。</p>
					</AdminInspector>
				)}
			</div>
			{editor.confirmation}
		</div>
	);
}
function MailboxManager({ refresh }: { refresh: () => Promise<void> }) {
	const list = useAdminList<AdminMailbox>('/admin/mailboxes'),
		domains = useAdminList<Domain>('/admin/domains'),
		task = useAdminTask();
	const editor = useAdminEditor({ id: '', address: '', name: '', enabled: true });
	const [search, setSearch] = useState(''),
		[domain, setDomain] = useState('');
	const filtered = list.items.filter(
		(row) => `${row.address} ${row.name}`.toLowerCase().includes(search.toLowerCase()) && (!domain || row.domainId === domain),
	);
	async function save() {
		await task.run(async () => {
			const d = editor.draft;
			await api(
				d.id ? `/admin/mailboxes/${d.id}` : '/admin/mailboxes',
				json(
					d.id ? 'PATCH' : 'POST',
					d.id ? { name: d.name, enabled: d.enabled } : { address: d.address, name: d.name, enabled: d.enabled },
				),
			);
			editor.finish();
			await Promise.all([list.reload(), refresh()]);
		});
	}
	return (
		<div className="admin-workspace">
			<AdminHeader
				title="邮箱管理"
				description="管理邮箱地址与显示名称，让每个地址各司其职。"
				busy={list.loading || task.busy}
				onRefresh={() => void task.run(list.reload, '列表已刷新')}
				action={
					<NewButton
						disabled={task.busy || domains.loading || !domains.items.length}
						onPress={() => editor.begin({ id: '', address: '', name: '', enabled: true })}
					>
						新建邮箱
					</NewButton>
				}
			/>
			<AdminStatus error={task.error || list.error || domains.error} notice={task.notice} />
			<div className={`workspace-split ${editor.open ? 'has-inspector' : ''}`}>
				<section className="workspace-list">
					<div className="workspace-filters">
						<AdminSearch value={search} onChange={setSearch} placeholder="搜索邮箱或显示名称" />
						<select aria-label="按域名筛选" value={domain} onChange={(e) => setDomain(e.target.value)}>
							<option value="">全部域名</option>
							{domains.items.map((d) => (
								<option key={d.id} value={d.id}>
									{d.name}
								</option>
							))}
						</select>
					</div>
					<div className="workspace-table" role="region" aria-label="数据列表，可横向滚动" tabIndex={0}>
						<table>
							<thead>
								<tr>
									<th>邮箱地址</th>
									<th>显示名称</th>
									<th>所属域名</th>
									<th>业务状态</th>
									<th>操作</th>
								</tr>
							</thead>
							<tbody>
								{filtered.map((row) => (
									<tr key={row.id} className={editor.open && editor.draft.id === row.id ? 'is-selected' : ''}>
										<td>
											<strong>{row.address}</strong>
										</td>
										<td>{row.name || <span className="workspace-muted">未设置</span>}</td>
										<td>{domains.items.find((d) => d.id === row.domainId)?.name || row.address.split('@')[1]}</td>
										<td>
											<EnabledBadge enabled={row.enabled} />
										</td>
										<td>
											<Button
												size="sm"
												variant="secondary"
												isDisabled={task.busy}
												onPress={() => editor.begin({ id: row.id, address: row.address, name: row.name, enabled: !!row.enabled })}
												aria-label={`编辑邮箱 ${row.address}`}
											>
												编辑
											</Button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					{(!filtered.length || list.loading) && (
						<AdminEmpty
							loading={list.loading}
							filtered={!!search || !!domain}
							title="尚未创建邮箱"
							description={domains.items.length ? '新建邮箱，或等待启用域名的地址收到第一封邮件。' : '请先到邮箱域名页面添加对应域名。'}
							onRetry={list.error ? () => void task.run(list.reload) : undefined}
						/>
					)}
					<p className="workspace-footnote">同一邮箱可共享给多个账号，读取与发送权限在账号授权中管理。停用后保留历史邮件。</p>
				</section>
				{editor.open && (
					<AdminInspector
						title={editor.draft.id ? '编辑邮箱' : '新建邮箱'}
						onClose={editor.close}
						onSave={save}
						saveLabel={editor.draft.id ? '保存修改' : '创建邮箱'}
						busy={task.busy}
						saveDisabled={!!editor.draft.id && !editor.dirty}
					>
						<AdminField label="邮箱地址">
							<input
								type="email"
								required
								value={editor.draft.address}
								readOnly={!!editor.draft.id}
								placeholder="name@example.com"
								onChange={(e) => editor.setDraft({ ...editor.draft, address: e.target.value })}
							/>
						</AdminField>
						<AdminField label="所属域名" hint={!editor.draft.id ? '邮箱地址所属域名须已添加。' : undefined}>
							<input readOnly value={editor.draft.address.split('@')[1] || ''} placeholder="根据邮箱地址自动识别" />
						</AdminField>
						<AdminField label="显示名称">
							<input
								value={editor.draft.name}
								maxLength={100}
								placeholder="例如：客户支持"
								onChange={(e) => editor.setDraft({ ...editor.draft, name: e.target.value })}
							/>
						</AdminField>
						<Check label="启用邮箱" value={editor.draft.enabled} onChange={(enabled) => editor.setDraft({ ...editor.draft, enabled })} />
						<p className="workspace-help">停用后保留历史邮件。此设置不覆盖所属域名的停用状态。</p>
					</AdminInspector>
				)}
			</div>
			{editor.confirmation}
		</div>
	);
}
type Permissions = Record<string, { canRead: boolean; canSend: boolean }>;
function AccountManager({ adminEmail, refresh }: { adminEmail: string; refresh: () => Promise<void> }) {
	const list = useAdminList<AccountGrant>('/admin/accounts'),
		boxes = useAdminList<AdminMailbox>('/admin/mailboxes'),
		task = useAdminTask();
	const editor = useAdminEditor({ email: '', existing: false, permissions: {} as Permissions });
	const [search, setSearch] = useState('');
	const filtered = list.items.filter((row) => row.email.toLowerCase().includes(search.toLowerCase()));
	function edit(row: AccountGrant) {
		editor.begin({
			email: row.email,
			existing: true,
			permissions: Object.fromEntries(row.grants.map((g) => [g.mailboxId, { canRead: g.canRead, canSend: g.canSend }])),
		});
	}
	async function save() {
		await task.run(async () => {
			await api(
				'/admin/accounts/grants',
				json('PUT', {
					email: editor.draft.email,
					grants: Object.entries(editor.draft.permissions).map(([mailboxId, permission]) => ({ mailboxId, ...permission })),
				}),
			);
			editor.finish();
			await Promise.all([list.reload(), refresh()]);
		}, '邮箱授权已保存');
	}
	return (
		<div className="admin-workspace">
			<AdminHeader
				title="账号授权"
				description="一个账号，多个邮箱。分别管理读取与发送权限。"
				busy={task.busy || list.loading}
				onRefresh={() => void task.run(list.reload, '列表已刷新')}
				action={
					<NewButton disabled={task.busy} onPress={() => editor.begin({ email: '', existing: false, permissions: {} })}>
						配置账号授权
					</NewButton>
				}
			/>
			<AdminStatus error={task.error || list.error || boxes.error} notice={task.notice} />
			<div className={`workspace-split ${editor.open ? 'has-inspector inspector-wide' : ''}`}>
				<section className="workspace-list">
					<div className="workspace-filters">
						<AdminSearch value={search} onChange={setSearch} placeholder="搜索账号邮箱" />
					</div>
					<div className="workspace-table" role="region" aria-label="数据列表，可横向滚动" tabIndex={0}>
						<table>
							<thead>
								<tr>
									<th>账号邮箱</th>
									<th>SSO 身份</th>
									<th>邮箱权限</th>
									<th>操作</th>
								</tr>
							</thead>
							<tbody>
								{filtered.map((row) => (
									<tr key={row.id} className={editor.open && editor.draft.email === row.email ? 'is-selected' : ''}>
										<td>
											<strong>{row.email}</strong>
										</td>
										<td>
											<AdminBadge kind={row.subject ? 'success' : 'muted'}>{row.subject ? '已绑定' : '待首次登录'}</AdminBadge>
										</td>
										<td>
											{row.email === adminEmail
												? '管理员 · 全部邮箱'
												: `${row.grants.filter((g) => g.canRead || g.canSend).length} 个邮箱`}
										</td>
										<td>
											<Button
												size="sm"
												variant="secondary"
												isDisabled={task.busy}
												onPress={() => edit(row)}
												aria-label={`配置授权 ${row.email}`}
											>
												配置授权
											</Button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					{(!filtered.length || list.loading) && (
						<AdminEmpty loading={list.loading} filtered={!!search} title="尚无账号" description="可在用户首次登录前预先配置邮箱授权。" />
					)}
					<p className="workspace-footnote">共享邮箱的已读、归档与垃圾箱状态在成员之间同步。</p>
				</section>
				{editor.open && (
					<AdminInspector
						wide
						title="配置账号授权"
						onClose={editor.close}
						onSave={save}
						busy={task.busy}
						saveLabel="保存邮箱授权"
						saveDisabled={boxes.loading || (!!editor.draft.existing && !editor.dirty)}
					>
						<AdminField label="SSO 登录邮箱" hint="可在首次登录前预分配；已有账号的邮箱不可在此修改。">
							<input
								type="email"
								required
								value={editor.draft.email}
								readOnly={editor.draft.existing}
								placeholder="user@example.com"
								onChange={(e) => {
									const found = list.items.find((row) => row.email === e.target.value.trim().toLowerCase());
									editor.setDraft({
										...editor.draft,
										email: e.target.value,
										permissions: found
											? Object.fromEntries(found.grants.map((g) => [g.mailboxId, { canRead: g.canRead, canSend: g.canSend }]))
											: {},
									});
								}}
							/>
						</AdminField>
						{editor.draft.email.trim().toLowerCase() === adminEmail && (
							<p className="workspace-callout">管理员始终拥有全部邮箱权限，下方授权不限制管理员访问。</p>
						)}
						<div className="workspace-permissions">
							<table>
								<thead>
									<tr>
										<th>邮箱</th>
										<th>读取</th>
										<th>发送</th>
									</tr>
								</thead>
								<tbody>
									{boxes.items.map((box) => (
										<tr key={box.id}>
											<td>{box.address}</td>
											{(['canRead', 'canSend'] as const).map((kind) => (
												<td key={kind}>
													<Check
														compact
														label={`${kind === 'canRead' ? '读取' : '发送'} ${box.address}`}
														value={editor.draft.permissions[box.id]?.[kind] || false}
														onChange={(value) =>
															editor.setDraft((old) => ({
																...old,
																permissions: {
																	...old.permissions,
																	[box.id]: { ...(old.permissions[box.id] || { canRead: false, canSend: false }), [kind]: value },
																},
															}))
														}
													/>
												</td>
											))}
										</tr>
									))}
								</tbody>
							</table>
						</div>
						{!boxes.items.length && <p className="workspace-help">{boxes.loading ? '正在加载邮箱…' : '尚无可授权邮箱，请先创建邮箱。'}</p>}
						<p className="workspace-help">首次登录后绑定稳定身份。清空勾选并保存即可撤销此账号的邮箱授权。</p>
					</AdminInspector>
				)}
			</div>
			{editor.confirmation}
		</div>
	);
}
