import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Button, Modal } from '@heroui/react';
import { Check as CheckIcon, Code2, FileText, Mail, Plus, RefreshCw, Search, Send, X } from 'lucide-react';
import { api, errorText, HttpError, json } from './api';
import { Check, Notice, SelectField } from './ui';
import { templateContent, templateInput, variablesSchema, type TemplateContent } from '../shared/open-contracts';
import type { SendResult } from '../shared/contracts';
import './templates.css';

export interface Template {
	id: string;
	code: string;
	name: string;
	description: string;
	enabled: number;
	mailboxes: string[];
	draftVersionId: string;
	publishedVersionId: string | null;
}
export interface TemplateDetail extends Template {
	versions: { id: string; content: TemplateContent; createdAt: number }[];
}
type Section = 'content' | 'variables' | 'settings' | 'versions';
type Preview = { subject: string; text: string; html: string };
type Draft = {
	code: string;
	name: string;
	description: string;
	enabled: boolean;
	mailboxes: string[];
	subject: string;
	text: string;
	html: string;
	definitions: string;
};
const blank = (): Draft => ({
	code: '',
	name: '',
	description: '',
	enabled: true,
	mailboxes: [],
	subject: '您好 {{username}}',
	text: '您好 {{username}}',
	html: '<p>您好 {{username}}</p>',
	definitions: JSON.stringify([{ name: 'username', required: true, maxLength: 100, mock: '张三' }], null, 2),
});
const toDraft = (template: TemplateDetail): Draft => {
	const version = template.versions.find((v) => v.id === template.draftVersionId);
	if (!version) throw new Error('草稿版本不存在，请刷新后重试。');
	return {
		code: template.code,
		name: template.name,
		description: template.description,
		enabled: !!template.enabled,
		mailboxes: template.mailboxes,
		subject: version.content.subject,
		text: version.content.text,
		html: version.content.html,
		definitions: JSON.stringify(version.content.variables, null, 2),
	};
};
function parseContent(draft: Draft) {
	let definitions: unknown;
	try {
		definitions = JSON.parse(draft.definitions);
	} catch {
		throw new Error('变量定义不是有效 JSON，请检查逗号和引号。');
	}
	const parsed = templateContent.safeParse({ subject: draft.subject, text: draft.text, html: draft.html, variables: definitions });
	if (!parsed.success) throw new Error(`请检查邮件内容或变量定义：${parsed.error.issues.map((i) => i.message).join('；')}`);
	return parsed.data;
}
function parseValues(source: string) {
	let values: unknown;
	try {
		values = JSON.parse(source);
	} catch {
		throw new Error('测试变量不是有效 JSON 对象。');
	}
	const parsed = variablesSchema.safeParse(values);
	if (!parsed.success) throw new Error('测试变量应为 JSON 对象，值仅支持文字、数字或布尔值。');
	return parsed.data;
}
function status(template: Template) {
	return !template.enabled
		? '已停用'
		: !template.publishedVersionId
			? '草稿'
			: template.publishedVersionId !== template.draftVersionId
				? '有未发布修改'
				: '已发布';
}
function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
	return (
		<div className="template-field">
			<label className="template-field-control">
				<span>{label}</span>
				{children}
			</label>
			{hint && <small>{hint}</small>}
		</div>
	);
}
function SourceEditor({
	label,
	value,
	onChange,
	mode,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	mode: 'html' | 'text' | 'json';
}) {
	const lines = useRef<HTMLDivElement>(null);
	const highlighted = useRef<HTMLPreElement>(null);
	const tokens = value.split(/(<\/?[\w:-]+|\/?>|[\w:-]+(?=\s*=)|"[^"]*"|'[^']*'|\{\{[A-Za-z][A-Za-z0-9_]*\}\})/g);
	return (
		<div className="template-source">
			<div ref={lines} className="template-line-numbers" aria-hidden="true">
				{value.split('\n').map((_, i) => (
					<span key={i}>{i + 1}</span>
				))}
			</div>
			<div className="template-code-surface">
				<pre ref={highlighted} className="template-highlight" aria-hidden="true">
					{mode === 'text'
						? value
						: tokens.map((token, i) => (
								<span
									key={i}
									className={
										/^<|^\/?>$/.test(token)
											? 'syntax-tag'
											: /^["']/.test(token)
												? 'syntax-string'
												: /\{\{/.test(token)
													? 'syntax-variable'
													: ''
									}
								>
									{token}
								</span>
							))}
					{'\n'}
				</pre>
				<textarea
					aria-label={label}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					spellCheck={false}
					autoCapitalize="off"
					autoCorrect="off"
					className={`template-code template-code-${mode}`}
					wrap="off"
					onScroll={(e) => {
						if (lines.current) lines.current.scrollTop = e.currentTarget.scrollTop;
						if (highlighted.current) {
							highlighted.current.scrollTop = e.currentTarget.scrollTop;
							highlighted.current.scrollLeft = e.currentTarget.scrollLeft;
						}
					}}
				/>
			</div>
		</div>
	);
}
export function Templates({ boxes }: { boxes: { address: string }[] }) {
	const [items, setItems] = useState<Template[]>([]);
	const [selected, setSelected] = useState<TemplateDetail | null>(null);
	const [draft, setDraft] = useState<Draft>(blank);
	const [saved, setSaved] = useState(() => JSON.stringify(blank()));
	const [section, setSection] = useState<Section>('content');
	const [mode, setMode] = useState<'html' | 'text'>('html');
	const [search, setSearch] = useState('');
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	const [notice, setNotice] = useState('');
	const [preview, setPreview] = useState<Preview | null>(null);
	const [previewError, setPreviewError] = useState('');
	const [previewBusy, setPreviewBusy] = useState(false);
	const [previewRevision, setPreviewRevision] = useState(0);
	const [values, setValues] = useState('{}');
	const [testOpen, setTestOpen] = useState(false);
	const [from, setFrom] = useState('');
	const [to, setTo] = useState('');
	const [testResult, setTestResult] = useState<SendResult | null>(null);
	const testAttempt = useRef<{
		key: string;
		id: string;
		body: { from: string; to: string; variables: ReturnType<typeof parseValues> };
	} | null>(null);
	const [testError, setTestError] = useState('');
	const [pending, setPending] = useState<string | null>(null);
	const [publishOpen, setPublishOpen] = useState(false);
	const dirty = saved !== JSON.stringify(draft);
	const selectionSequence = useRef(0);
	const persistedId = useRef<string | null>(null);
	const previewSequence = useRef(0);
	const dirtyRef = useRef(dirty);
	dirtyRef.current = dirty;
	const patch = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((old) => ({ ...old, [key]: value }));
	const apply = useCallback((template: TemplateDetail | null) => {
		const next = template ? toDraft(template) : blank();
		persistedId.current = template?.id || null;
		setSelected(template);
		setDraft(next);
		setSaved(JSON.stringify(next));
		setSection(template ? 'content' : 'settings');
		setValues('{}');
		setPreview(null);
		setError('');
		setNotice('');
		testAttempt.current = null;
		setTestResult(null);
		setTestError('');
	}, []);
	const choose = useCallback(
		async (id: string) => {
			const sequence = ++selectionSequence.current;
			if (id === 'new') {
				apply(null);
				return;
			}
			const template = await api<TemplateDetail>(`/admin/templates/${id}`);
			if (sequence === selectionSequence.current) apply(template);
		},
		[apply],
	);
	const load = useCallback(async () => {
		const list = await api<Template[]>('/admin/templates');
		setItems(list);
		return list;
	}, []);
	useEffect(() => {
		let active = true;
		void (async () => {
			try {
				const list = await api<Template[]>('/admin/templates');
				if (!active) return;
				setItems(list);
				if (list.length) await choose(list[0].id);
				else apply(null);
			} catch (e) {
				if (active) setError(errorText(e));
			} finally {
				if (active) setLoading(false);
			}
		})();
		return () => {
			active = false;
			selectionSequence.current++;
		};
	}, [apply, choose]);
	useEffect(() => {
		const beforeUnload = (event: BeforeUnloadEvent) => {
			if (dirtyRef.current) {
				event.preventDefault();
				event.returnValue = '';
			}
		};
		window.addEventListener('beforeunload', beforeUnload);
		return () => window.removeEventListener('beforeunload', beforeUnload);
	}, []);
	useEffect(() => {
		const sequence = ++previewSequence.current;
		setPreviewBusy(true);
		setPreviewError('');
		const timer = setTimeout(() => {
			void (async () => {
				try {
					const content = parseContent({
						...blank(),
						subject: draft.subject,
						text: draft.text,
						html: draft.html,
						definitions: draft.definitions,
					});
					const result = await api<Preview>('/admin/templates/preview', json('POST', { content, variables: parseValues(values) }));
					if (sequence === previewSequence.current) setPreview(result);
				} catch (e) {
					if (sequence === previewSequence.current) setPreviewError(errorText(e));
				} finally {
					if (sequence === previewSequence.current) setPreviewBusy(false);
				}
			})();
		}, 500);
		return () => {
			clearTimeout(timer);
			previewSequence.current++;
		};
	}, [draft.subject, draft.text, draft.html, draft.definitions, values, previewRevision]);
	useEffect(() => {
		if (!testResult || testResult.status !== 'pending') return;
		let active = true;
		const timer = setInterval(() => {
			void api<SendResult>(`/messages/send/${testResult.id}`)
				.then((result) => {
					if (active) setTestResult(result);
				})
				.catch((error) => {
					if (active) setTestError(errorText(error));
				});
		}, 2000);
		return () => {
			active = false;
			clearInterval(timer);
		};
	}, [testResult]);
	async function action(fn: () => Promise<void>) {
		if (busy) return;
		setBusy(true);
		setError('');
		setNotice('');
		try {
			await fn();
		} catch (e) {
			setError(errorText(e));
		} finally {
			setBusy(false);
		}
	}
	function navigate(id: string) {
		if (busy || id === selected?.id) return;
		if (dirty) setPending(id);
		else void action(() => choose(id));
	}
	async function save() {
		if (!draft.name.trim() || !/^[a-zA-Z0-9_-]{1,100}$/.test(draft.code)) {
			setSection('settings');
			throw new Error('请填写模板名称和有效编码，编码仅支持字母、数字、下划线和短横线。');
		}
		const content = parseContent(draft);
		const input = templateInput.safeParse({
			code: draft.code,
			name: draft.name,
			description: draft.description,
			enabled: draft.enabled,
			mailboxes: draft.mailboxes,
			content,
		});
		if (!input.success) throw new Error(input.error.issues.map((i) => i.message).join('；'));
		const id = selected?.id || persistedId.current;
		const result = await api<{ id: string }>(id ? `/admin/templates/${id}` : '/admin/templates', json(id ? 'PUT' : 'POST', input.data));
		persistedId.current = result.id;
		// Once saved, preserve the ID even if the subsequent refresh fails.
		const template = await api<TemplateDetail>(`/admin/templates/${result.id}`);
		apply(template);
		await load();
		setNotice('草稿已保存，已发布版本不受影响。');
	}
	async function publish() {
		if (!selected || dirty) return;
		await api(`/admin/templates/${selected.id}/publish`, json('POST', { versionId: selected.draftVersionId }));
		setPublishOpen(false);
		await choose(selected.id);
		await load();
		setNotice('草稿已发布，后续 API 调用将使用此版本。');
	}
	const testBoxes = boxes.filter((box) => !draft.mailboxes.length || draft.mailboxes.includes(box.address));
	function openTest() {
		setFrom(testBoxes.some((box) => box.address === from) ? from : testBoxes[0]?.address || '');
		setTestError('');
		setTestOpen(true);
	}
	async function sendTest() {
		if (!selected || dirty || busy || testResult) return;
		setBusy(true);
		setTestError('');
		try {
			if (!testAttempt.current)
				testAttempt.current = { key: crypto.randomUUID(), id: selected.id, body: { from, to, variables: parseValues(values) } };
			const attempt = testAttempt.current;
			const result = await api<SendResult>(`/admin/templates/${attempt.id}/test`, {
				...json('POST', attempt.body),
				headers: { 'Idempotency-Key': attempt.key },
			});
			setTestResult(result);
		} catch (e) {
			setTestError(errorText(e));
			if (e instanceof HttpError && e.status >= 400 && e.status < 500) testAttempt.current = null;
		} finally {
			setBusy(false);
		}
	}
	const visibleItems = items.filter((template) => `${template.code} ${template.name}`.toLowerCase().includes(search.toLowerCase()));
	return (
		<div className="template-workspace" aria-busy={loading || busy}>
			<header className="template-page-heading">
				<h1>编辑工作台</h1>
				<span>邮件模板</span>
			</header>
			<div className="template-layout">
				<aside className="template-library" aria-label="模板库">
					<div className="template-library-title">
						<h2>模板库</h2>
						<span>{items.length}</span>
					</div>
					<label className="template-search">
						<Search size={16} />
						<input aria-label="搜索模板" placeholder="搜索模板" value={search} onChange={(e) => setSearch(e.target.value)} />
						<span className="sr-only">按名称或编码搜索</span>
					</label>
					<Button size="sm" className="template-new" onPress={() => navigate('new')} isDisabled={busy || loading}>
						<Plus size={16} />
						新建模板
					</Button>
					<div className="template-library-items">
						{loading ? (
							<p role="status">正在加载模板…</p>
						) : (
							visibleItems.map((template) => (
								<button
									type="button"
									className={`template-library-item ${selected?.id === template.id ? 'is-selected' : ''}`}
									aria-pressed={selected?.id === template.id}
									disabled={busy}
									key={template.id}
									onClick={() => navigate(template.id)}
								>
									<strong>{template.name}</strong>
									<code>{template.code}</code>
									<small>{status(template)}</small>
								</button>
							))
						)}
						{!loading && !visibleItems.length && (
							<div className="template-library-empty">
								<FileText size={24} />
								<strong>{items.length ? '没有匹配的模板' : '还没有模板'}</strong>
								<p>{items.length ? '试试其他名称或编码。' : '新建一个模板，开始复用邮件内容。'}</p>
							</div>
						)}
					</div>
					<p className="template-library-note">
						<Mail size={15} />
						一次编辑，重复使用。
					</p>
				</aside>
				<section className="template-editor" aria-label="模板编辑器">
					<header className="template-editor-heading">
						<div className="template-editor-title">
							<div>
								<h2>{draft.name || '新建模板'}</h2>
								{draft.code && <code>{draft.code}</code>}
								<span
									className={`template-status ${selected?.publishedVersionId === selected?.draftVersionId && selected ? 'is-published' : ''}`}
								>
									{dirty ? '未保存' : selected ? status(selected) : '草稿'}
								</span>
							</div>
							<p>{dirty ? '有未保存的修改，请先保存草稿。' : '草稿不会影响已发布版本。'}</p>
						</div>
						<div className="template-header-actions">
							<Button size="sm" isDisabled={busy || loading || (!!selected && !dirty)} onPress={() => void action(save)}>
								{busy ? '处理中…' : '保存草稿'}
							</Button>
							<Button
								size="sm"
								variant="outline"
								isDisabled={busy || !selected || dirty || selected.publishedVersionId === selected.draftVersionId}
								onPress={() => setPublishOpen(true)}
							>
								发布
							</Button>
						</div>
					</header>
					{error && <Notice error>{error}</Notice>}
					{notice && (
						<Notice>
							<CheckIcon size={16} />
							{notice}
						</Notice>
					)}
					<nav className="template-tabs" aria-label="模板编辑区域">
						{(
							[
								['content', '内容'],
								['variables', '变量'],
								['settings', '设置'],
								['versions', '版本'],
							] as const
						).map(([id, label]) => (
							<button type="button" key={id} aria-current={section === id ? 'page' : undefined} onClick={() => setSection(id)}>
								{label}
							</button>
						))}
					</nav>
					<fieldset disabled={busy || loading} className="template-editor-fields">
						{section === 'content' && (
							<div className="template-content-layout">
								<section className="template-content-source" aria-label="邮件内容">
									<Field label="邮件主题">
										<input
											value={draft.subject}
											onChange={(e) => patch('subject', e.target.value)}
											placeholder="输入邮件主题，支持 {{变量名}}"
											maxLength={998}
										/>
									</Field>
									<div className="template-source-toolbar">
										<div className="template-segment" aria-label="正文格式">
											<button type="button" aria-pressed={mode === 'html'} onClick={() => setMode('html')}>
												<Code2 size={14} />
												HTML
											</button>
											<button type="button" aria-pressed={mode === 'text'} onClick={() => setMode('text')}>
												<FileText size={14} />
												纯文本
											</button>
										</div>
										<span>{mode === 'html' ? 'HTML 源码' : '纯文本正文'}</span>
									</div>
									<SourceEditor
										key={`${selected?.id || 'new'}:${mode}`}
										label={mode === 'html' ? 'HTML 源码' : '纯文本正文'}
										value={draft[mode]}
										onChange={(value) => patch(mode, value)}
										mode={mode}
									/>
									<p className="template-help">使用 {'{{变量名}}'} 插入动态内容，在“变量”中定义。</p>
								</section>
								<section className="template-preview-panel" aria-label="邮件预览">
									<header>
										<h3>预览</h3>
										<div>
											<Button
												size="sm"
												variant="ghost"
												isIconOnly
												aria-label="刷新预览"
												onPress={() => setPreviewRevision((v) => v + 1)}
												isDisabled={previewBusy}
											>
												<RefreshCw size={15} className={previewBusy ? 'template-spinning' : ''} />
											</Button>
											<Button size="sm" variant="outline" onPress={openTest} isDisabled={!selected || dirty}>
												<Send size={14} />
												测试发送
											</Button>
										</div>
									</header>
									{previewError && <Notice error>{previewError}</Notice>}
									<div className="template-preview-canvas" aria-busy={previewBusy}>
										{preview ? (
											<>
												<div className="template-preview-subject">
													<span>主题</span>
													<strong>{preview.subject || '（无主题）'}</strong>
												</div>
												{mode === 'html' && preview.html ? (
													<iframe title="模板安全预览" sandbox="" srcDoc={preview.html} />
												) : (
													<pre className="template-text-preview">{preview.text || '（无纯文本正文）'}</pre>
												)}
											</>
										) : (
											<div className="template-preview-empty">
												<Mail size={28} />
												<strong>{previewBusy ? '正在生成预览…' : '预览暂不可用'}</strong>
												<p>{previewBusy ? '使用变量模拟值呈现邮件内容。' : '请检查内容与变量定义。'}</p>
											</div>
										)}
									</div>
									<div className="template-preview-footer">
										<span>{previewBusy ? '正在更新预览…' : previewError ? '当前预览未更新' : '使用变量模拟值 · 内容修改后自动更新'}</span>
										<button type="button" onClick={() => setSection('variables')}>
											调整变量
										</button>
									</div>
								</section>
							</div>
						)}
						{section === 'variables' && (
							<section className="template-section template-variable-layout">
								<div>
									<h3>变量定义</h3>
									<p>为动态内容设置名称、必填规则、默认值与模拟值。</p>
									<SourceEditor
										label="变量定义（JSON 数组）"
										value={draft.definitions}
										onChange={(v) => patch('definitions', v)}
										mode="json"
									/>
									<p className="template-help">支持 name、required、default、mock、maxLength。名称与正文中的占位符保持一致。</p>
								</div>
								<div>
									<h3>预览变量</h3>
									<p>填写 JSON 对象覆盖模拟值，留空对象时使用变量的 mock 或 default。</p>
									<SourceEditor label="测试变量（JSON 对象）" value={values} onChange={setValues} mode="json" />
									<p className="template-help">仅用于预览与测试发送，不会写入模板。</p>
									<Button size="sm" variant="secondary" onPress={() => setSection('content')}>
										查看邮件预览
									</Button>
								</div>
							</section>
						)}
						{section === 'settings' && (
							<section className="template-section template-settings">
								<div>
									<h3>基本信息</h3>
									<p>设置用于管理的名称，以及 API 调用时使用的唯一编码。</p>
								</div>
								<div className="template-settings-grid">
									<Field label="模板名称 *">
										<input
											value={draft.name}
											onChange={(e) => patch('name', e.target.value)}
											maxLength={100}
											placeholder="例如：欢迎新用户"
										/>
									</Field>
									<Field
										label="模板编码 *"
										hint={selected ? '创建后不可修改，API 通过此编码调用模板。' : '字母、数字、下划线或短横线，创建后不可修改。'}
									>
										<input
											value={draft.code}
											onChange={(e) => patch('code', e.target.value)}
											readOnly={!!selected || !!persistedId.current}
											maxLength={100}
											placeholder="例如：welcome_email"
										/>
									</Field>
								</div>
								<Field label="描述">
									<textarea
										rows={3}
										value={draft.description}
										onChange={(e) => patch('description', e.target.value)}
										maxLength={1000}
										placeholder="说明模板的用途，方便日后查找。"
									/>
								</Field>
								<div className="template-setting-divider">
									<h3>发送设置</h3>
									<Check label="启用模板" value={draft.enabled} onChange={(v) => patch('enabled', v)} />
									<p className="template-help">停用后，外部 API 无法使用此模板发送邮件。</p>
								</div>
								<fieldset className="template-mailboxes">
									<legend>允许使用的发件邮箱</legend>
									{boxes.map((box) => (
										<Check
											key={box.address}
											label={box.address}
											value={draft.mailboxes.includes(box.address)}
											onChange={(value) =>
												patch(
													'mailboxes',
													value ? [...draft.mailboxes, box.address] : draft.mailboxes.filter((address) => address !== box.address),
												)
											}
										/>
									))}
									{!boxes.length && <p>请先在邮箱管理中创建邮箱。</p>}
								</fieldset>
								<p className="template-help">不勾选时不额外限制邮箱；发送仍需 API 密钥的邮箱权限。</p>
							</section>
						)}
						{section === 'versions' && (
							<section className="template-section template-versions">
								<h3>版本记录</h3>
								<p>保存草稿会创建新版本，发布后才会用于外部 API 发送。</p>
								{selected ? (
									<ol>
										{selected.versions.map((version, index) => (
											<li key={version.id}>
												<div>
													<strong>版本 {selected.versions.length - index}</strong>
													{version.id === selected.draftVersionId && <span className="template-status">当前草稿</span>}
													{version.id === selected.publishedVersionId && <span className="template-status is-published">已发布</span>}
												</div>
												<time>{new Date(version.createdAt).toLocaleString('zh-CN')}</time>
												<code>{version.id}</code>
											</li>
										))}
									</ol>
								) : (
									<div className="template-version-empty">
										<FileText size={28} />
										<p>保存第一个草稿后，版本记录将显示在这里。</p>
									</div>
								)}
							</section>
						)}
					</fieldset>
				</section>
			</div>
			<Modal
				isOpen={pending !== null}
				onOpenChange={(open) => {
					if (!open) setPending(null);
				}}
			>
				<Modal.Backdrop>
					<Modal.Container>
						<Modal.Dialog className="template-modal">
							<Modal.Header>
								<Modal.Heading>保留当前修改？</Modal.Heading>
							</Modal.Header>
							<Modal.Body>
								<p>当前模板有未保存的修改。继续切换将放弃这些修改。</p>
							</Modal.Body>
							<Modal.Footer>
								<Button variant="tertiary" onPress={() => setPending(null)}>
									继续编辑
								</Button>
								<Button
									variant="secondary"
									onPress={() => {
										const id = pending!;
										setPending(null);
										void action(() => choose(id));
									}}
								>
									放弃修改并切换
								</Button>
							</Modal.Footer>
						</Modal.Dialog>
					</Modal.Container>
				</Modal.Backdrop>
			</Modal>
			<Modal
				isOpen={publishOpen}
				onOpenChange={(open) => {
					if (!busy) setPublishOpen(open);
				}}
			>
				<Modal.Backdrop>
					<Modal.Container>
						<Modal.Dialog className="template-modal">
							<Modal.Header>
								<Modal.Heading>发布当前草稿？</Modal.Heading>
							</Modal.Header>
							<Modal.Body>
								<p>“{selected?.name}”的已保存草稿将成为发布版本。后续 API 调用会使用此版本。</p>
								{error && <Notice error>{error}</Notice>}
							</Modal.Body>
							<Modal.Footer>
								<Button variant="tertiary" isDisabled={busy} onPress={() => setPublishOpen(false)}>
									取消
								</Button>
								<Button isDisabled={busy} onPress={() => void action(publish)}>
									{busy ? '正在发布…' : '确认发布'}
								</Button>
							</Modal.Footer>
						</Modal.Dialog>
					</Modal.Container>
				</Modal.Backdrop>
			</Modal>
			<Modal
				isOpen={testOpen}
				onOpenChange={(open) => {
					if (!busy) setTestOpen(open);
				}}
			>
				<Modal.Backdrop>
					<Modal.Container>
						<Modal.Dialog className="template-modal">
							<Modal.Header>
								<div className="template-modal-heading">
									<Modal.Heading>测试发送</Modal.Heading>
									<Button
										isIconOnly
										size="sm"
										variant="ghost"
										aria-label="关闭测试发送"
										isDisabled={busy}
										onPress={() => setTestOpen(false)}
									>
										<X size={18} />
									</Button>
								</div>
							</Modal.Header>
							<Modal.Body>
								<p className="template-help">发送当前已保存草稿。请先在预览中确认内容与变量。</p>
								<fieldset disabled={busy || !!testAttempt.current} className="template-test-fields">
									<SelectField
										label="发件邮箱"
										value={from}
										onChange={setFrom}
										options={testBoxes.map((box) => ({ id: box.address, label: box.address }))}
										placeholder="选择发件邮箱"
									/>
									<Field label="收件邮箱">
										<input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="name@example.com" />
									</Field>
								</fieldset>
								{testError && (
									<Notice error>
										{testError}
										{testAttempt.current && <p>本次请求会沿用同一发送键，不会自动创建重复邮件。</p>}
									</Notice>
								)}
								{testResult && (
									<Notice error={testResult.status !== 'accepted'}>
										<strong>
											{testResult.status === 'accepted'
												? '邮件服务已接受测试邮件'
												: testResult.status === 'failed'
													? '测试发送失败'
													: '发送结果待确认'}
										</strong>
										<p>
											{testResult.status === 'accepted'
												? '此状态不代表最终送达，请检查收件邮箱。'
												: `请先确认收件结果，勿重复发送。错误代码：${testResult.errorCode || '无'}`}
										</p>
									</Notice>
								)}
							</Modal.Body>
							<Modal.Footer>
								<Button variant="tertiary" isDisabled={busy} onPress={() => setTestOpen(false)}>
									关闭
								</Button>
								{testResult && ['accepted', 'failed'].includes(testResult.status) && (
									<Button
										variant="secondary"
										onPress={() => {
											testAttempt.current = null;
											setTestResult(null);
											setTestError('');
										}}
									>
										新建测试
									</Button>
								)}
								<Button isDisabled={busy || !from || !to || !!testResult || dirty} onPress={() => void sendTest()}>
									<Send size={15} />
									{busy ? '正在发送…' : testResult ? '已提交' : testAttempt.current ? '检查本次发送' : '发送测试邮件'}
								</Button>
							</Modal.Footer>
						</Modal.Dialog>
					</Modal.Container>
				</Modal.Backdrop>
			</Modal>
		</div>
	);
}
