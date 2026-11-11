import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Button, Modal } from '@heroui/react';
import { CheckCircle2, Copy, Inbox, Plus, RefreshCw, Search, X } from 'lucide-react';
import { api, errorText } from './api';
import { Notice } from './ui';
import './admin-workspace.css';

export const AdminDirtyContext = createContext<(dirty: boolean) => void>(() => {});

export function useAdminList<T>(url: string) {
	const [items, setItems] = useState<T[]>([]),
		[loading, setLoading] = useState(true),
		[error, setError] = useState('');
	const sequence = useRef(0);
	const reload = useCallback(async () => {
		const request = ++sequence.current;
		setLoading(true);
		setError('');
		try {
			const rows = await api<T[]>(url);
			if (request === sequence.current) setItems(rows);
		} catch (e) {
			if (request === sequence.current) setError(errorText(e));
			throw e;
		} finally {
			if (request === sequence.current) setLoading(false);
		}
	}, [url]);
	useEffect(() => {
		void reload().catch(() => {});
		return () => {
			sequence.current++;
		};
	}, [reload]);
	return { items, loading, error, reload };
}
export function useAdminTask() {
	const [busy, setBusy] = useState(false),
		[error, setError] = useState(''),
		[notice, setNotice] = useState('');
	const locked = useRef(false);
	async function run(action: () => Promise<void>, success = '配置已保存') {
		if (locked.current) return false;
		locked.current = true;
		setBusy(true);
		setError('');
		setNotice('');
		try {
			await action();
			setNotice(success);
			return true;
		} catch (e) {
			setError(errorText(e));
			return false;
		} finally {
			locked.current = false;
			setBusy(false);
		}
	}
	return {
		busy,
		error,
		notice,
		run,
		clear: () => {
			setError('');
			setNotice('');
		},
	};
}
export function useAdminEditor<T>(initial: T) {
	const [draft, setDraft] = useState(initial),
		[open, setOpen] = useState(false),
		[baseline, setBaseline] = useState(JSON.stringify(initial));
	const [pending, setPending] = useState<(() => void) | null>(null);
	const dirty = open && baseline !== JSON.stringify(draft);
	const reportDirty = useContext(AdminDirtyContext);
	useEffect(() => {
		reportDirty(dirty);
		return () => reportDirty(false);
	}, [dirty, reportDirty]);
	const dirtyRef = useRef(dirty);
	dirtyRef.current = dirty;
	useEffect(() => {
		const protect = (e: BeforeUnloadEvent) => {
			if (dirtyRef.current) {
				e.preventDefault();
				e.returnValue = '';
			}
		};
		window.addEventListener('beforeunload', protect);
		return () => window.removeEventListener('beforeunload', protect);
	}, []);
	function guard(action: () => void) {
		if (dirty) setPending(() => action);
		else action();
	}
	function begin(value: T, afterOpen?: () => void) {
		guard(() => {
			setDraft(value);
			setBaseline(JSON.stringify(value));
			setOpen(true);
			afterOpen?.();
		});
	}
	function close() {
		guard(() => setOpen(false));
	}
	function finish() {
		setBaseline(JSON.stringify(draft));
		setOpen(false);
	}
	const confirmation = (
		<AdminConfirm
			open={!!pending}
			title="放弃未保存的修改？"
			description="当前修改尚未保存。继续操作将放弃这些修改。"
			confirm="放弃修改并继续"
			onCancel={() => setPending(null)}
			onConfirm={() => {
				pending?.();
				setPending(null);
			}}
		/>
	);
	return { draft, setDraft, open, dirty, begin, close, finish, guard, confirmation };
}
export function AdminHeader({
	title,
	description,
	action,
	onRefresh,
	busy = false,
}: {
	title: string;
	description: string;
	action?: ReactNode;
	onRefresh?: () => void;
	busy?: boolean;
}) {
	return (
		<header className="workspace-heading">
			<div>
				<h1>{title}</h1>
				<p>{description}</p>
			</div>
			<div className="workspace-heading-actions">
				{onRefresh && (
					<Button size="sm" variant="ghost" isIconOnly aria-label="刷新列表" isDisabled={busy} onPress={onRefresh}>
						<RefreshCw size={16} />
					</Button>
				)}
				{action}
			</div>
		</header>
	);
}
export function NewButton({ children, onPress, disabled = false }: { children: ReactNode; onPress: () => void; disabled?: boolean }) {
	return (
		<Button size="sm" className="workspace-primary" onPress={onPress} isDisabled={disabled}>
			<Plus size={16} />
			{children}
		</Button>
	);
}
export function AdminStatus({ error, notice }: { error?: string; notice?: string }) {
	return (
		<>
			{error && <Notice error>{error}</Notice>}
			{notice && (
				<Notice>
					<CheckCircle2 size={16} />
					{notice}
				</Notice>
			)}
		</>
	);
}
export function AdminSearch({
	value,
	onChange,
	placeholder = '搜索',
	label,
}: {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	label?: string;
}) {
	return (
		<label className="workspace-search">
			<Search size={17} />
			<input aria-label={label || placeholder} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
		</label>
	);
}
export function AdminBadge({ children, kind = 'muted' }: { children: ReactNode; kind?: 'success' | 'muted' | 'danger' | 'warning' }) {
	return <span className={`workspace-badge is-${kind}`}>{children}</span>;
}
export function EnabledBadge({ enabled }: { enabled: boolean | number }) {
	return <AdminBadge kind={enabled ? 'success' : 'muted'}>{enabled ? '启用' : '停用'}</AdminBadge>;
}
export function AdminEmpty({
	loading = false,
	filtered = false,
	title,
	description,
	onRetry,
}: {
	loading?: boolean;
	filtered?: boolean;
	title: string;
	description: string;
	onRetry?: () => void;
}) {
	return (
		<div className="workspace-empty" role="status">
			<Inbox size={28} />
			<h2>{loading ? '正在加载…' : filtered ? '没有匹配的结果' : title}</h2>
			<p>{loading ? '正在获取最新数据。' : filtered ? '调整搜索条件后再试。' : description}</p>
			{onRetry && !loading && (
				<Button variant="secondary" size="sm" onPress={onRetry}>
					重新加载
				</Button>
			)}
		</div>
	);
}
export function AdminField({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
	return (
		<div className="workspace-field">
			<label>
				<span>{label}</span>
				{children}
			</label>
			{hint && <small>{hint}</small>}
		</div>
	);
}
export function AdminInspector({
	title,
	children,
	onClose,
	onSave,
	saveLabel = '保存修改',
	busy = false,
	saveDisabled = false,
	wide = false,
	footer,
}: {
	title: string;
	children: ReactNode;
	onClose: () => void;
	onSave?: () => Promise<void> | void;
	saveLabel?: string;
	busy?: boolean;
	saveDisabled?: boolean;
	wide?: boolean;
	footer?: ReactNode;
}) {
	const id = useId(),
		panel = useRef<HTMLElement>(null);
	useEffect(() => {
		// Clicking an offscreen row action can pan a narrow table. Restore its
		// identifying columns once focus moves into the editor.
		panel.current?.parentElement?.querySelector<HTMLElement>('.workspace-table')?.scrollTo({ left: 0, behavior: 'instant' });
		panel.current?.querySelector<HTMLElement>('input:not([readonly]):not([disabled]), select, textarea')?.focus({ preventScroll: true });
		if (matchMedia('(max-width: 900px)').matches) panel.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
	}, []);
	return (
		<aside ref={panel} className={`workspace-inspector ${wide ? 'is-wide' : ''}`} aria-label={title}>
			<header>
				<h2>{title}</h2>
				<Button size="sm" variant="ghost" isIconOnly aria-label={`关闭${title}`} onPress={onClose} isDisabled={busy}>
					<X size={18} />
				</Button>
			</header>
			<form
				id={id}
				onSubmit={(e) => {
					e.preventDefault();
					if (!busy && !saveDisabled) void onSave?.();
				}}
			>
				<fieldset disabled={busy}>{children}</fieldset>
			</form>
			<footer>
				{footer || (
					<>
						{onSave && (
							<Button size="sm" form={id} type="submit" isDisabled={busy || saveDisabled}>
								{busy ? '正在保存…' : saveLabel}
							</Button>
						)}
						<Button size="sm" variant="outline" onPress={onClose} isDisabled={busy}>
							{onSave ? '取消' : '关闭'}
						</Button>
					</>
				)}
			</footer>
		</aside>
	);
}
export function AdminConfirm({
	open,
	title,
	description,
	confirm = '确认',
	onConfirm,
	onCancel,
	busy = false,
	danger = false,
}: {
	open: boolean;
	title: string;
	description: string;
	confirm?: string;
	onConfirm: () => void;
	onCancel: () => void;
	busy?: boolean;
	danger?: boolean;
}) {
	return (
		<Modal
			isOpen={open}
			onOpenChange={(value) => {
				if (!value && !busy) onCancel();
			}}
		>
			<Modal.Backdrop>
				<Modal.Container>
					<Modal.Dialog className="workspace-dialog">
						<Modal.Header>
							<Modal.Heading>{title}</Modal.Heading>
						</Modal.Header>
						<Modal.Body>
							<p>{description}</p>
						</Modal.Body>
						<Modal.Footer>
							<Button variant="tertiary" onPress={onCancel} isDisabled={busy}>
								取消
							</Button>
							<Button variant={danger ? 'danger' : 'primary'} onPress={onConfirm} isDisabled={busy}>
								{busy ? '处理中…' : confirm}
							</Button>
						</Modal.Footer>
					</Modal.Dialog>
				</Modal.Container>
			</Modal.Backdrop>
		</Modal>
	);
}
export function AdminSecret({ value, label, onHide }: { value: string; label: string; onHide: () => void }) {
	const [copied, setCopied] = useState(false),
		[error, setError] = useState('');
	return (
		<section className="workspace-secret" aria-label={label}>
			<strong>{label}仅显示一次，请立即保存。</strong>
			<p>关闭此提示后将无法再次查看，请妥善保管。</p>
			<code>{value}</code>
			<div>
				<Button
					size="sm"
					variant="outline"
					onPress={() => {
						void navigator.clipboard
							.writeText(value)
							.then(() => setCopied(true))
							.catch(() => setError('复制失败，请选中上方内容手动复制。'));
					}}
				>
					<Copy size={14} />
					{copied ? '已复制' : '复制'}
				</Button>
				<Button size="sm" variant="secondary" onPress={onHide}>
					已保存，隐藏
				</Button>
			</div>
			{error && <p role="alert">{error}</p>}
		</section>
	);
}
export const adminTime = (value: number | null) => (value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '尚未使用');
