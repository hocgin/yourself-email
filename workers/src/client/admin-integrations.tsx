import { useState } from 'react';
import { Button } from '@heroui/react';
import { api, json } from './api';
import { Check } from './ui';
import { keyInput, webhookInput, type Scope } from '../shared/open-contracts';
import {
	AdminBadge,
	AdminConfirm,
	AdminEmpty,
	AdminField,
	AdminHeader,
	AdminInspector,
	AdminSearch,
	AdminSecret,
	AdminStatus,
	EnabledBadge,
	NewButton,
	adminTime,
	useAdminEditor,
	useAdminList,
	useAdminTask,
} from './admin-components';
export interface ApiKey {
	id: string;
	name: string;
	prefix: string;
	enabled: number;
	revokedAt: number | null;
	expiresAt: number | null;
	minuteLimit: number;
	dayLimit: number;
	lastUsedAt: number | null;
	mailboxes: { email: string; scopes: Scope[] }[];
}
interface Box {
	address: string;
}
interface BoxesProps {
	boxes: Box[];
	boxError?: string;
	boxesLoading?: boolean;
}
const scopes: { id: Scope; label: string }[] = [
	{ id: 'mail:send', label: '发送' },
	{ id: 'mail:read', label: '读取' },
	{ id: 'attachment:read', label: '附件' },
];
const localDate = (value: number | null) =>
	value ? new Date(value - new Date(value).getTimezoneOffset() * 60000).toISOString().slice(0, 19) : '';
function MailboxChoices({
	boxes,
	value,
	onChange,
	loading,
}: {
	boxes: Box[];
	value: string[];
	onChange: (value: string[]) => void;
	loading?: boolean;
}) {
	return (
		<fieldset className="workspace-checkbox-list">
			<legend>授权邮箱</legend>
			{boxes.map((box) => (
				<Check
					key={box.address}
					label={box.address}
					value={value.includes(box.address)}
					onChange={(enabled) => onChange(enabled ? [...value, box.address] : value.filter((address) => address !== box.address))}
				/>
			))}
			{!boxes.length && <p className="workspace-help">{loading ? '正在加载邮箱…' : '请先在邮箱管理中创建邮箱。'}</p>}
		</fieldset>
	);
}
export function ApiKeys({ boxes, boxError, boxesLoading }: BoxesProps) {
	const list = useAdminList<ApiKey>('/admin/api-keys'),
		task = useAdminTask();
	const blank = { id: '', name: '', enabled: true, expiry: '', minute: '60', day: '10000', grants: {} as Record<string, Scope[]> };
	const editor = useAdminEditor(blank);
	const [search, setSearch] = useState(''),
		[secret, setSecret] = useState(''),
		[revoke, setRevoke] = useState<ApiKey | null>(null);
	const filtered = list.items.filter((key) =>
		`${key.name} ${key.prefix} ${key.mailboxes.map((box) => box.email).join(' ')}`.toLowerCase().includes(search.toLowerCase()),
	);
	function edit(key: ApiKey) {
		editor.begin({
			id: key.id,
			name: key.name,
			enabled: !!key.enabled,
			expiry: localDate(key.expiresAt),
			minute: String(key.minuteLimit),
			day: String(key.dayLimit),
			grants: Object.fromEntries(key.mailboxes.map((box) => [box.email, box.scopes])),
		});
	}
	async function save() {
		await task.run(
			async () => {
				const d = editor.draft,
					original = list.items.find((key) => key.id === d.id);
				const expiresAt = d.expiry
					? d.expiry === localDate(original?.expiresAt || null)
						? original!.expiresAt
						: Date.parse(d.expiry)
					: null;
				const parsed = keyInput.safeParse({
					name: d.name,
					enabled: d.enabled,
					expiresAt,
					minuteLimit: Number(d.minute),
					dayLimit: Number(d.day),
					mailboxes: Object.entries(d.grants)
						.filter(([, values]) => values.length)
						.map(([email, scopes]) => ({ email, scopes })),
				});
				if (!parsed.success) throw new Error('请检查名称、有效期、调用限额和邮箱权限。每分钟与每日限额须为有效正整数。');
				if (d.id) await api(`/admin/api-keys/${d.id}`, json('PUT', parsed.data));
				else {
					const result = await api<{ secret: string }>('/admin/api-keys', json('POST', parsed.data));
					setSecret(result.secret);
				}
				editor.finish();
				await list.reload();
			},
			editor.draft.id ? '密钥配置已保存' : '密钥已创建，请立即保存下方密钥',
		);
	}
	return (
		<div className="admin-workspace">
			<AdminHeader
				title="API 密钥"
				description="为服务端调用分配独立密钥，精确控制邮箱权限与调用限额。"
				busy={task.busy || list.loading}
				onRefresh={() => void task.run(list.reload, '列表已刷新')}
				action={
					<NewButton disabled={task.busy || !!secret} onPress={() => editor.begin(blank)}>
						创建密钥
					</NewButton>
				}
			/>
			<AdminStatus error={task.error || list.error || boxError} notice={task.notice} />
			{secret && <AdminSecret label="API 密钥" value={secret} onHide={() => setSecret('')} />}
			<div className={`workspace-split ${editor.open ? 'has-inspector inspector-wide' : ''}`}>
				<section className="workspace-list">
					<div className="workspace-filters">
						<AdminSearch value={search} onChange={setSearch} placeholder="搜索名称、密钥前缀或邮箱" />
					</div>
					<div className="workspace-table" role="region" aria-label="数据列表，可横向滚动" tabIndex={0}>
						<table>
							<thead>
								<tr>
									<th>密钥名称 / 前缀</th>
									<th>授权邮箱</th>
									<th>调用限额</th>
									<th>状态 / 最近使用</th>
									<th>操作</th>
								</tr>
							</thead>
							<tbody>
								{filtered.map((key) => (
									<tr key={key.id} className={editor.open && editor.draft.id === key.id ? 'is-selected' : ''}>
										<td>
											<strong>{key.name}</strong>
											<small>
												<code>{key.prefix}…</code>
											</small>
										</td>
										<td>
											{key.mailboxes.length ? (
												<>
													{key.mailboxes.length} 个邮箱<small>{key.mailboxes.map((box) => box.email).join('、')}</small>
												</>
											) : (
												<span className="workspace-muted">未授权邮箱</span>
											)}
										</td>
										<td>
											{key.minuteLimit.toLocaleString()} / 分钟<small>{key.dayLimit.toLocaleString()} / 每日（UTC）</small>
										</td>
										<td>
											{key.revokedAt ? (
												<AdminBadge kind="danger">已撤销</AdminBadge>
											) : key.expiresAt && key.expiresAt < Date.now() ? (
												<AdminBadge kind="warning">已过期</AdminBadge>
											) : (
												<EnabledBadge enabled={key.enabled} />
											)}
											<small>{adminTime(key.lastUsedAt)}</small>
										</td>
										<td>
											<div className="workspace-row-actions">
												<Button
													size="sm"
													variant="secondary"
													isDisabled={task.busy || !!key.revokedAt || !!secret}
													aria-label={`编辑密钥 ${key.name}`}
													onPress={() => edit(key)}
												>
													编辑权限
												</Button>
												<Button
													size="sm"
													variant="ghost"
													className="workspace-danger"
													isDisabled={task.busy || !!key.revokedAt}
													aria-label={`撤销密钥 ${key.name}`}
													onPress={() => setRevoke(key)}
												>
													撤销
												</Button>
											</div>
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
							title="尚无 API 密钥"
							description="创建一枚独立密钥，为服务端调用配置邮箱与权限。"
						/>
					)}
					<p className="workspace-footnote">完整密钥仅在创建时显示一次。附件下载权限需要同时启用读取邮件。</p>
				</section>
				{editor.open && (
					<AdminInspector
						wide
						title={editor.draft.id ? '编辑密钥' : '创建密钥'}
						onClose={editor.close}
						onSave={save}
						busy={task.busy}
						saveDisabled={boxesLoading || (!!editor.draft.id && !editor.dirty)}
						saveLabel={editor.draft.id ? '保存修改' : '创建并显示密钥'}
					>
						<AdminField label="名称">
							<input
								required
								maxLength={100}
								value={editor.draft.name}
								placeholder="例如：网站通知服务"
								onChange={(e) => editor.setDraft({ ...editor.draft, name: e.target.value })}
							/>
						</AdminField>
						<AdminField label="有效期（本地时间）" hint="留空表示永久有效。">
							<input
								type="datetime-local"
								step="1"
								value={editor.draft.expiry}
								onChange={(e) => editor.setDraft({ ...editor.draft, expiry: e.target.value })}
							/>
						</AdminField>
						<div className="workspace-form-columns">
							<AdminField label="每分钟上限">
								<input
									type="number"
									required
									min={1}
									max={100000}
									step={1}
									value={editor.draft.minute}
									onChange={(e) => editor.setDraft({ ...editor.draft, minute: e.target.value })}
								/>
							</AdminField>
							<AdminField label="每日上限（UTC）">
								<input
									type="number"
									required
									min={1}
									max={10000000}
									step={1}
									value={editor.draft.day}
									onChange={(e) => editor.setDraft({ ...editor.draft, day: e.target.value })}
								/>
							</AdminField>
						</div>
						<Check label="启用密钥" value={editor.draft.enabled} onChange={(enabled) => editor.setDraft({ ...editor.draft, enabled })} />
						<div className="workspace-permissions">
							<table>
								<thead>
									<tr>
										<th>邮箱</th>
										{scopes.map((scope) => (
											<th key={scope.id}>{scope.label}</th>
										))}
									</tr>
								</thead>
								<tbody>
									{boxes.map((box) => (
										<tr key={box.address}>
											<td>{box.address}</td>
											{scopes.map((scope) => (
												<td key={scope.id}>
													<Check
														compact
														label={`${box.address}：${scope.label}`}
														value={(editor.draft.grants[box.address] || []).includes(scope.id)}
														onChange={(value) =>
															editor.setDraft((old) => {
																let next = value
																	? [...new Set([...(old.grants[box.address] || []), scope.id])]
																	: (old.grants[box.address] || []).filter((s) => s !== scope.id);
																if (value && scope.id === 'attachment:read') next = [...new Set([...next, 'mail:read' as const])];
																if (!value && scope.id === 'mail:read') next = next.filter((s) => s !== 'attachment:read');
																return { ...old, grants: { ...old.grants, [box.address]: next } };
															})
														}
													/>
												</td>
											))}
										</tr>
									))}
								</tbody>
							</table>
						</div>
						{!boxes.length && (
							<p className="workspace-help">{boxesLoading ? '正在加载邮箱…' : '尚无可授权邮箱；密钥未授权前不能访问邮箱。'}</p>
						)}
						<p className="workspace-help">附件权限会自动包含读取权限；取消读取会同时取消附件权限。</p>
					</AdminInspector>
				)}
			</div>
			{editor.confirmation}
			<AdminConfirm
				open={!!revoke}
				title="撤销此密钥？"
				description={`“${revoke?.name || ''}”撤销后立即失效，无法恢复。使用此密钥的服务将无法继续调用。`}
				confirm="确认撤销"
				danger
				busy={task.busy}
				onCancel={() => setRevoke(null)}
				onConfirm={() => {
					if (!revoke) return;
					const key = revoke;
					void task
						.run(async () => {
							await api(`/admin/api-keys/${key.id}/revoke`, json('POST', {}));
							if (editor.draft.id === key.id) editor.finish();
							await list.reload();
						}, '密钥已撤销')
						.then(() => setRevoke(null));
				}}
			/>
		</div>
	);
}
interface Endpoint {
	id: string;
	name: string;
	url: string;
	enabled: number;
	mailboxes: string[];
	lastDelivery: { status: string; lastStatus: number | null } | null;
}
interface Delivery {
	id: string;
	endpointId: string;
	endpointName: string;
	status: string;
	attempts: number;
	lastStatus: number | null;
	lastError: string | null;
	createdAt: number;
	payload: string;
}
interface Attempt {
	id: string;
	attempt: number;
	status: number | null;
	error: string | null;
	startedAt: number;
	finishedAt: number | null;
}
const states: Record<string, string> = {
	pending: '等待投递',
	processing: '投递中',
	succeeded: '成功',
	failed: '失败',
	cancelled: '已取消',
};
function DeliveryBadge({ status }: { status: string }) {
	return (
		<AdminBadge
			kind={
				status === 'succeeded'
					? 'success'
					: status === 'failed'
						? 'danger'
						: status === 'pending' || status === 'processing'
							? 'warning'
							: 'muted'
			}
		>
			{states[status] || status}
		</AdminBadge>
	);
}
function eventLabel(payload: string) {
	try {
		return JSON.parse(payload).test ? '测试事件' : '收件事件';
	} catch {
		return '收件事件';
	}
}
export function WebhookManager({ boxes, boxError, boxesLoading }: BoxesProps) {
	const list = useAdminList<Endpoint>('/admin/webhooks'),
		deliveries = useAdminList<Delivery>('/admin/webhook-deliveries'),
		task = useAdminTask();
	const editor = useAdminEditor({ id: '', name: '', url: '', enabled: true, mailboxes: [] as string[] });
	const [tab, setTab] = useState<'endpoints' | 'deliveries'>('endpoints'),
		[search, setSearch] = useState(''),
		[endpoint, setEndpoint] = useState(''),
		[secret, setSecret] = useState('');
	const [detail, setDetail] = useState<{ delivery: Delivery; attempts: Attempt[] } | null>(null),
		[testTarget, setTestTarget] = useState<Endpoint | null>(null),
		[replay, setReplay] = useState<Delivery | null>(null);
	const filtered = list.items.filter((row) => `${row.name} ${row.url}`.toLowerCase().includes(search.toLowerCase()));
	const history = deliveries.items.filter(
		(row) =>
			(!endpoint || row.endpointId === endpoint) &&
			`${row.id} ${row.endpointName} ${row.lastError || ''}`.toLowerCase().includes(search.toLowerCase()),
	);
	async function reload() {
		await Promise.all([list.reload(), deliveries.reload()]);
	}
	async function save() {
		await task.run(async () => {
			const d = editor.draft,
				parsed = webhookInput.safeParse({ name: d.name, url: d.url, enabled: d.enabled, mailboxes: d.mailboxes });
			if (!parsed.success || !d.url.startsWith('https://')) throw new Error('请填写名称、公网 HTTPS 回调地址，并至少选择一个邮箱。');
			if (d.id) await api(`/admin/webhooks/${d.id}`, json('PUT', parsed.data));
			else {
				const result = await api<{ secret: string }>('/admin/webhooks', json('POST', parsed.data));
				setSecret(result.secret);
			}
			editor.finish();
			await reload();
		}, 'Webhook 配置已保存');
	}
	return (
		<div className="admin-workspace">
			<AdminHeader
				title="收件 Webhook"
				description="订阅 email.received，接收邮箱的新邮件事件。"
				busy={task.busy || list.loading || deliveries.loading}
				onRefresh={() => void task.run(reload, '投递记录已刷新')}
				action={
					<NewButton
						disabled={task.busy || !!secret}
						onPress={() =>
							editor.begin({ id: '', name: '', url: '', enabled: true, mailboxes: [] }, () => {
								setDetail(null);
								setTab('endpoints');
								setSearch('');
							})
						}
					>
						新建 Webhook
					</NewButton>
				}
			/>
			<AdminStatus error={task.error || list.error || deliveries.error || boxError} notice={task.notice} />
			{secret && <AdminSecret label="签名 Secret" value={secret} onHide={() => setSecret('')} />}
			<nav className="workspace-subnav" aria-label="Webhook 视图">
				<button
					type="button"
					aria-current={tab === 'endpoints' ? 'page' : undefined}
					onClick={() =>
						editor.guard(() => {
							editor.finish();
							setDetail(null);
							setSearch('');
							setTab('endpoints');
						})
					}
				>
					回调端点
				</button>
				<button
					type="button"
					aria-current={tab === 'deliveries' ? 'page' : undefined}
					onClick={() =>
						editor.guard(() => {
							editor.finish();
							setDetail(null);
							setSearch('');
							setTab('deliveries');
						})
					}
				>
					投递历史
				</button>
			</nav>
			<div className={`workspace-split ${editor.open || detail ? 'has-inspector inspector-wide' : ''}`}>
				<section className="workspace-list">
					<div className="workspace-filters">
						<AdminSearch
							value={search}
							onChange={setSearch}
							placeholder={tab === 'endpoints' ? '搜索端点名称或回调地址' : '搜索端点、事件 ID 或错误'}
						/>
						{tab === 'deliveries' && (
							<select
								aria-label="按回调端点筛选"
								value={endpoint}
								onChange={(e) => {
									setEndpoint(e.target.value);
									setDetail(null);
								}}
							>
								<option value="">全部端点</option>
								{list.items.map((row) => (
									<option key={row.id} value={row.id}>
										{row.name}
									</option>
								))}
							</select>
						)}
					</div>
					{tab === 'endpoints' ? (
						<>
							<div className="workspace-table" role="region" aria-label="数据列表，可横向滚动" tabIndex={0}>
								<table>
									<thead>
										<tr>
											<th>端点名称 / 回调地址</th>
											<th>授权邮箱</th>
											<th>业务状态</th>
											<th>最近投递</th>
											<th>操作</th>
										</tr>
									</thead>
									<tbody>
										{filtered.map((row) => (
											<tr key={row.id} className={editor.open && editor.draft.id === row.id ? 'is-selected' : ''}>
												<td>
													<strong>{row.name}</strong>
													<small className="workspace-url">{row.url}</small>
												</td>
												<td>
													{row.mailboxes.length} 个邮箱<small>{row.mailboxes.join('、')}</small>
												</td>
												<td>
													<EnabledBadge enabled={row.enabled} />
												</td>
												<td>
													{row.lastDelivery ? (
														<DeliveryBadge status={row.lastDelivery.status} />
													) : (
														<span className="workspace-muted">暂无投递</span>
													)}
												</td>
												<td>
													<div className="workspace-row-actions">
														<Button
															size="sm"
															variant="secondary"
															isDisabled={task.busy || !!secret}
															aria-label={`编辑 Webhook ${row.name}`}
															onPress={() => {
																setDetail(null);
																editor.begin({
																	id: row.id,
																	name: row.name,
																	url: row.url,
																	enabled: !!row.enabled,
																	mailboxes: row.mailboxes,
																});
															}}
														>
															编辑
														</Button>
														<Button
															size="sm"
															variant="ghost"
															isDisabled={task.busy || !row.enabled}
															aria-label={`发送测试事件 ${row.name}`}
															onPress={() => setTestTarget(row)}
														>
															测试事件
														</Button>
													</div>
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
									title="尚无回调端点"
									description="新建 Webhook，将收件事件推送到你的服务。"
								/>
							)}
						</>
					) : (
						<>
							<div className="workspace-table" role="region" aria-label="数据列表，可横向滚动" tabIndex={0}>
								<table>
									<thead>
										<tr>
											<th>端点 / 时间</th>
											<th>事件</th>
											<th>状态 / 响应</th>
											<th>尝试次数</th>
											<th>操作</th>
										</tr>
									</thead>
									<tbody>
										{history.map((row) => (
											<tr key={row.id} className={detail?.delivery.id === row.id ? 'is-selected' : ''}>
												<td>
													<strong>{row.endpointName}</strong>
													<small>{adminTime(row.createdAt)}</small>
												</td>
												<td>{eventLabel(row.payload)}</td>
												<td>
													<DeliveryBadge status={row.status} />
													<small>{row.lastStatus || row.lastError || '—'}</small>
												</td>
												<td>{row.attempts}</td>
												<td>
													<div className="workspace-row-actions">
														<Button
															size="sm"
															variant="secondary"
															isDisabled={task.busy}
															aria-label={`查看投递 ${row.id}`}
															onPress={() =>
																void task.run(async () => {
																	const attempts = await api<Attempt[]>(`/admin/webhook-deliveries/${encodeURIComponent(row.id)}/attempts`);
																	setDetail({ delivery: row, attempts });
																}, '')
															}
														>
															详情
														</Button>
														{['failed', 'cancelled'].includes(row.status) && (
															<Button
																size="sm"
																variant="ghost"
																isDisabled={task.busy || !list.items.find((e) => e.id === row.endpointId)?.enabled}
																aria-label={`重放投递 ${row.id}`}
																onPress={() => setReplay(row)}
															>
																重放
															</Button>
														)}
													</div>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
							{(!history.length || deliveries.loading) && (
								<AdminEmpty
									loading={deliveries.loading}
									filtered={!!search || !!endpoint}
									title="暂无投递记录"
									description="收到新邮件或发送测试事件后，投递结果会显示在这里。"
								/>
							)}
						</>
					)}
					<p className="workspace-footnote">事件至少投递一次，接收方需按事件 ID 去重。投递历史显示最新 100 条。</p>
				</section>
				{editor.open && (
					<AdminInspector
						wide
						title={editor.draft.id ? '编辑 Webhook' : '新建 Webhook'}
						onClose={editor.close}
						onSave={save}
						busy={task.busy}
						saveDisabled={boxesLoading || !editor.draft.mailboxes.length || (!!editor.draft.id && !editor.dirty)}
						saveLabel={editor.draft.id ? '保存修改' : '创建 Webhook'}
					>
						<AdminField label="名称">
							<input
								required
								value={editor.draft.name}
								maxLength={100}
								placeholder="例如：收件通知"
								onChange={(e) => editor.setDraft({ ...editor.draft, name: e.target.value })}
							/>
						</AdminField>
						<AdminField label="公网 HTTPS 回调 URL">
							<input
								type="url"
								required
								value={editor.draft.url}
								placeholder="https://example.com/webhooks/mail"
								onChange={(e) => editor.setDraft({ ...editor.draft, url: e.target.value })}
							/>
						</AdminField>
						<Check
							label="启用 Webhook"
							value={editor.draft.enabled}
							onChange={(enabled) => editor.setDraft({ ...editor.draft, enabled })}
						/>
						<MailboxChoices
							boxes={boxes}
							value={editor.draft.mailboxes}
							loading={boxesLoading}
							onChange={(mailboxes) => editor.setDraft({ ...editor.draft, mailboxes })}
						/>
						<p className="workspace-help">至少选择一个邮箱。停用后将取消尚未发送的投递。</p>
						<p className="workspace-help">使用创建时显示的签名 Secret 验证回调来源；编辑配置不会生成新 Secret。</p>
					</AdminInspector>
				)}
				{detail && (
					<AdminInspector wide title="投递详情" onClose={() => setDetail(null)}>
						<dl className="workspace-details">
							<dt>端点</dt>
							<dd>{detail.delivery.endpointName}</dd>
							<dt>事件 / 投递 ID</dt>
							<dd>
								<code>{detail.delivery.id}</code>
							</dd>
							<dt>状态</dt>
							<dd>
								<DeliveryBadge status={detail.delivery.status} />
							</dd>
							<dt>时间</dt>
							<dd>{adminTime(detail.delivery.createdAt)}</dd>
						</dl>
						<h3>投递尝试</h3>
						{detail.attempts.length ? (
							<ol className="workspace-attempts">
								{detail.attempts.map((attempt) => (
									<li key={attempt.id}>
										<strong>
											第 {attempt.attempt} 次尝试{' '}
											<AdminBadge kind={attempt.status && attempt.status < 300 ? 'success' : 'danger'}>
												{attempt.status || '未返回 HTTP 状态'}
											</AdminBadge>
										</strong>
										<time>{adminTime(attempt.startedAt)}</time>
										{attempt.finishedAt && <span>耗时 {attempt.finishedAt - attempt.startedAt} ms</span>}
										{attempt.error && <p>{attempt.error}</p>}
									</li>
								))}
							</ol>
						) : (
							<p className="workspace-help">尚无投递尝试，事件可能仍在队列中。</p>
						)}
					</AdminInspector>
				)}
			</div>
			{editor.confirmation}
			<AdminConfirm
				open={!!testTarget}
				title="发送测试事件？"
				description={`将向“${testTarget?.name || ''}”配置的公网回调地址投递一条测试事件。此事件不对应真实邮件。`}
				confirm="发送测试事件"
				busy={task.busy}
				onCancel={() => setTestTarget(null)}
				onConfirm={() => {
					if (!testTarget) return;
					const row = testTarget;
					void task
						.run(async () => {
							await api(`/admin/webhooks/${row.id}/test`, json('POST', {}));
							await reload();
						}, '测试事件已入库，等待队列投递。')
						.then(() => setTestTarget(null));
				}}
			/>
			<AdminConfirm
				open={!!replay}
				title="重放此投递？"
				description="接收服务可能再次收到同一事件，请确保接收方已按事件 ID 去重。"
				confirm="确认重放"
				busy={task.busy}
				onCancel={() => setReplay(null)}
				onConfirm={() => {
					if (!replay) return;
					const row = replay;
					void task
						.run(async () => {
							await api(`/admin/webhook-deliveries/${encodeURIComponent(row.id)}/replay`, json('POST', {}));
							setDetail(null);
							await reload();
						}, '已安排重放。')
						.then(() => setReplay(null));
				}}
			/>
		</div>
	);
}
interface Log {
	id: string;
	keyName: string;
	prefix: string;
	operation: string;
	mailbox: string | null;
	status: number;
	errorCode: string | null;
	duration: number;
	createdAt: number;
}
export function ApiLogs() {
	const [key, setKey] = useState(''),
		[search, setSearch] = useState(''),
		[status, setStatus] = useState(''),
		[detail, setDetail] = useState<Log | null>(null);
	const list = useAdminList<Log>(`/admin/api-call-logs${key ? `?keyId=${encodeURIComponent(key)}` : ''}`),
		keys = useAdminList<ApiKey>('/admin/api-keys'),
		task = useAdminTask();
	const filtered = list.items.filter(
		(row) =>
			`${row.operation} ${row.mailbox || ''} ${row.id} ${row.errorCode || ''}`.toLowerCase().includes(search.toLowerCase()) &&
			(!status || Math.floor(row.status / 100) === Number(status)),
	);
	return (
		<div className="admin-workspace">
			<AdminHeader
				title="API 调用日志"
				description="查看最近 30 天的最新 100 条调用，不记录完整密钥和邮件内容。"
				busy={task.busy || list.loading}
				onRefresh={() => void task.run(list.reload, '调用日志已刷新')}
			/>
			<AdminStatus error={task.error || list.error || keys.error} notice={task.notice} />
			<div className={`workspace-split ${detail ? 'has-inspector inspector-wide' : ''}`}>
				<section className="workspace-list">
					<div className="workspace-filters">
						<AdminSearch
							value={search}
							onChange={(value) => {
								setSearch(value);
								setDetail(null);
							}}
							placeholder="搜索操作、邮箱或请求 ID"
						/>
						<select
							aria-label="按 API 密钥筛选"
							value={key}
							onChange={(e) => {
								setKey(e.target.value);
								setDetail(null);
							}}
						>
							<option value="">全部密钥</option>
							{keys.items.map((row) => (
								<option key={row.id} value={row.id}>
									{row.name}
								</option>
							))}
						</select>
						<select
							aria-label="按 HTTP 状态筛选"
							value={status}
							onChange={(e) => {
								setStatus(e.target.value);
								setDetail(null);
							}}
						>
							<option value="">全部状态</option>
							<option value="2">2xx 成功</option>
							<option value="4">4xx 请求错误</option>
							<option value="5">5xx 服务错误</option>
						</select>
					</div>
					<div className="workspace-table" role="region" aria-label="数据列表，可横向滚动" tabIndex={0}>
						<table>
							<thead>
								<tr>
									<th>调用时间</th>
									<th>密钥</th>
									<th>操作 / 邮箱</th>
									<th>HTTP 状态</th>
									<th>耗时</th>
									<th>操作</th>
								</tr>
							</thead>
							<tbody>
								{filtered.map((row) => (
									<tr key={row.id} className={detail?.id === row.id ? 'is-selected' : ''}>
										<td>{adminTime(row.createdAt)}</td>
										<td>
											<strong>{row.keyName}</strong>
											<small>
												<code>{row.prefix}…</code>
											</small>
										</td>
										<td>
											<code>{row.operation}</code>
											<small>{row.mailbox || '—'}</small>
										</td>
										<td>
											<AdminBadge kind={row.status < 400 ? 'success' : 'danger'}>{row.status}</AdminBadge>
											{row.errorCode && <small>{row.errorCode}</small>}
										</td>
										<td>{row.duration} ms</td>
										<td>
											<Button size="sm" variant="secondary" aria-label={`查看请求 ${row.id}`} onPress={() => setDetail(row)}>
												详情
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
							filtered={!!search || !!status || !!key}
							title="暂无调用记录"
							description="使用 API 密钥调用后，请求状态与耗时会显示在这里。"
						/>
					)}
					<p className="workspace-footnote">搜索与状态筛选作用于当前返回的最新记录。请求 ID 可用于关联服务端日志。</p>
				</section>
				{detail && (
					<AdminInspector wide title="调用详情" onClose={() => setDetail(null)}>
						<dl className="workspace-details">
							<dt>请求 ID</dt>
							<dd>
								<code>{detail.id}</code>
							</dd>
							<dt>调用时间</dt>
							<dd>{adminTime(detail.createdAt)}</dd>
							<dt>API 密钥</dt>
							<dd>
								{detail.keyName} · {detail.prefix}…
							</dd>
							<dt>操作</dt>
							<dd>
								<code>{detail.operation}</code>
							</dd>
							<dt>邮箱</dt>
							<dd>{detail.mailbox || '—'}</dd>
							<dt>HTTP 状态</dt>
							<dd>
								<AdminBadge kind={detail.status < 400 ? 'success' : 'danger'}>{detail.status}</AdminBadge>
							</dd>
							<dt>耗时</dt>
							<dd>{detail.duration} ms</dd>
							<dt>错误代码</dt>
							<dd>
								<code>{detail.errorCode || '无'}</code>
							</dd>
						</dl>
					</AdminInspector>
				)}
			</div>
		</div>
	);
}
