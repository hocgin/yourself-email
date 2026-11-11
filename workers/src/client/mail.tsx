import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Input, TextField } from '@heroui/react';
import {
	Archive,
	ArrowLeft,
	ChevronRight,
	Inbox,
	Mail,
	MailOpen,
	Paperclip,
	PenLine,
	Reply,
	Search,
	Send,
	Trash2,
	Undo2,
	History,
	Settings,
	FileText,
	Download,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, downloadAttachment, errorText, json } from './api';
import { Check as CheckBox, Empty, Notice, Refresh, SelectField } from './ui';
import { Compose } from './compose';
import type { Folder, Identity, Mailbox, Message, MessageDetail, Page } from '../shared/contracts';
const folders = [
	{ id: 'inbox', title: '收件箱', icon: Inbox },
	{ id: 'sent', title: '已发送', icon: Send },
	{ id: 'archive', title: '归档', icon: Archive },
	{ id: 'trash', title: '垃圾箱', icon: Trash2 },
] as const;
function displayDate(value: number) {
	return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(value);
}
export function MailboxApp({ user, boxes, refresh }: { user: Identity; boxes: Mailbox[]; refresh: () => Promise<void> }) {
	const [mailboxId, setMailbox] = useState(''),
		[folder, setFolder] = useState<Folder>('inbox'),
		[query, setQuery] = useState(''),
		[q, setQ] = useState(''),
		[unread, setUnread] = useState(false),
		[items, setItems] = useState<Message[]>([]),
		[cursor, setCursor] = useState<string | null>(null),
		[loading, setLoading] = useState(false),
		[error, setError] = useState(''),
		[selected, setSelected] = useState<string | null>(null),
		[compose, setCompose] = useState(false),
		[reply, setReply] = useState<MessageDetail | undefined>(),
		[revision, setRevision] = useState(0),
		[historyId, setHistoryId] = useState<string | null>(null);
	const listEpoch = useRef(0);
	const box = boxes.find((b) => b.id === mailboxId),
		readable = box?.canRead;
	useEffect(() => {
		if (!boxes.some((b) => b.id === mailboxId)) setMailbox(boxes[0]?.id || '');
	}, [boxes, mailboxId]);
	useEffect(() => {
		const timer = setTimeout(() => setQ(query), 300);
		return () => clearTimeout(timer);
	}, [query]);
	useEffect(() => {
		setSelected(null);
		setHistoryId(null);
	}, [mailboxId, folder, q, unread]);
	const path = useCallback(
		(next?: string) =>
			historyId
				? `/messages/${historyId}/history?${new URLSearchParams(next ? { cursor: next } : {})}`
				: `/messages?${new URLSearchParams({ mailboxId, folder, q, unread: String(unread), ...(next ? { cursor: next } : {}) })}`,
		[mailboxId, folder, q, unread, historyId],
	);
	useEffect(() => {
		let active = true;
		listEpoch.current++;
		setError('');
		setItems([]);
		setCursor(null);
		if (!mailboxId || !readable) return;
		setLoading(true);
		api<Page<Message>>(path())
			.then((page) => {
				if (active) {
					setItems(page.items);
					setCursor(page.nextCursor);
				}
			})
			.catch((e) => {
				if (active) setError(errorText(e));
			})
			.finally(() => {
				if (active) setLoading(false);
			});
		return () => {
			active = false;
		};
	}, [path, revision, readable]);
	async function more() {
		if (!cursor) return;
		const epoch = listEpoch.current;
		setLoading(true);
		try {
			const page = await api<Page<Message>>(path(cursor));
			if (epoch !== listEpoch.current) return;
			setItems((old) => [...old, ...page.items]);
			setCursor(page.nextCursor);
		} catch (e) {
			if (epoch === listEpoch.current) setError(errorText(e));
		} finally {
			if (epoch === listEpoch.current) setLoading(false);
		}
	}
	async function update() {
		setRevision((v) => v + 1);
		await refresh();
	}
	useEffect(() => {
		if (!readable) {
			setSelected(null);
			setHistoryId(null);
		}
	}, [readable]);
	const activeTitle = folders.find((f) => f.id === folder)?.title || '收件箱';
	return (
		<div className="mail-shell">
			<aside className="sidebar">
				<div className="mailbox-selector">
					<SelectField
						label="切换邮箱"
						hideLabel
						value={mailboxId}
						onChange={setMailbox}
						placeholder="等待分配邮箱"
						disabled={!boxes.length}
						options={boxes.map((b) => ({
							id: b.id,
							label: `${b.address}${!b.enabled || !b.domainEnabled ? ' · 已停用' : ''}`,
						}))}
					/>
					<span className="mailbox-caption">{box?.name || '我的邮箱'}</span>
				</div>
				<Button
					size="sm"
					className="compose-button"
					onPress={() => {
						setReply(undefined);
						setCompose(true);
					}}
					isDisabled={!boxes.some((b) => b.canSend && b.enabled && b.domainEnabled)}
				>
					<PenLine size={17} />
					写邮件
				</Button>
				<nav aria-label="邮件文件夹">
					{folders.map((f) => (
						<Button
							size="sm"
							variant="ghost"
							key={f.id}
							aria-current={folder === f.id ? 'page' : undefined}
							className={`folder ${folder === f.id ? 'active' : ''}`}
							onPress={() => {
								setFolder(f.id);
								setHistoryId(null);
							}}
						>
							<f.icon size={18} />
							{f.title}
							{f.id === 'inbox' && !!box?.unreadCount && <span className="count">{box.unreadCount}</span>}
						</Button>
					))}
				</nav>
				<div className="sidebar-bottom">
					{user.isAdmin ? (
						<Link to="/admin/domains" className="sidebar-management">
							<Settings size={20} />
							管理后台
						</Link>
					) : (
						<p className="mailbox-access">
							{box?.canRead ? '可读取' : ''}
							{box?.canRead && box?.canSend ? ' / ' : ''}
							{box?.canSend ? '可发送' : ''}
						</p>
					)}
				</div>
			</aside>
			<main className={`mail-main ${selected ? 'has-selection' : ''}`}>
				<section className="mail-list-panel">
					<header className="panel-heading">
						<div>
							<h1>
								{historyId ? '会话记录' : activeTitle}
								<span>
									{folder === 'inbox' && !historyId ? box?.unreadCount || 0 : items.length}
									{cursor && folder !== 'inbox' ? '+' : ''}
								</span>
							</h1>
						</div>
						<div className="list-heading-actions">
							{!historyId && <CheckBox label="仅看未读" value={unread} onChange={setUnread} />}
							<Refresh onPress={() => void update()} />
						</div>
					</header>
					{historyId ? (
						<Button variant="tertiary" size="sm" className="history-back-button" onPress={() => setHistoryId(null)}>
							<ArrowLeft size={15} />
							返回文件夹
						</Button>
					) : (
						<>
							<TextField aria-label="搜索邮件" value={query} onChange={setQuery} className="search-field">
								<Search size={17} />
								<Input placeholder="搜索邮件（主题、发件人或摘要）" />
							</TextField>
						</>
					)}
					{error && <Notice error>{error}</Notice>}
					<div className="message-list">
						{!boxes.length ? (
							<Empty
								title={user.isAdmin ? '创建你的第一个邮箱' : '等待分配邮箱'}
								description={
									user.isAdmin
										? '在左下角的管理后台添加域名与邮箱，即可开始收发邮件。'
										: '账号已登录。请联系管理员，为此账号分配邮箱的读取或发送权限。'
								}
							/>
						) : !readable ? (
							<Empty title="此邮箱仅有发送权限" description="你可以使用此地址写邮件，历史邮件需要额外的读取权限。" />
						) : !items.length ? (
							<Empty
								title={loading ? '正在加载…' : '这里还没有邮件'}
								description={loading ? '正在获取最新邮件。' : q ? '试试其他关键词。' : '新邮件到达后会显示在这里。'}
							/>
						) : (
							items.map((item) => (
								<button
									key={item.id}
									aria-pressed={selected === item.id}
									className={`message-row ${selected === item.id ? 'selected' : ''} ${!item.isRead ? 'unread' : ''}`}
									onClick={() => setSelected(item.id)}
								>
									<span className="message-unread-indicator" aria-label={!item.isRead ? '未读' : undefined} />
									<div className="message-avatar">
										{(item.direction === 'inbound' ? item.from.name || item.from.email : item.to[0]?.email || '?')
											.slice(0, 1)
											.toUpperCase()}
									</div>
									<div className="message-summary">
										<div className="message-line">
											<strong>
												{item.direction === 'inbound'
													? item.from.name || item.from.email
													: `发至 ${item.to.map((a) => a.email).join(', ')}`}
											</strong>
											<time>{displayDate(item.date)}</time>
										</div>
										<div className="message-subject">
											{item.subject || '（无主题）'}
											{item.hasAttachments && <Paperclip size={13} />}
										</div>
										<p>{item.snippet || '无正文摘要'}</p>
										{item.sendState && item.sendState !== 'accepted' && (
											<span className="state-tag">
												{item.sendState === 'pending' ? '正在提交' : item.sendState === 'failed' ? '发送失败' : '结果不确定'}
											</span>
										)}
									</div>
									<ChevronRight className="row-arrow" size={14} />
								</button>
							))
						)}
					</div>
					{cursor && (
						<Button size="sm" variant="tertiary" className="load-more" isDisabled={loading} onPress={() => void more()}>
							{loading ? '正在加载…' : '加载更多'}
						</Button>
					)}
				</section>
				<section className="mail-detail-panel">
					{selected ? (
						<MessageView
							key={selected}
							id={selected}
							box={box}
							onBack={() => setSelected(null)}
							onChange={update}
							onReply={(message) => {
								setReply(message);
								setCompose(true);
							}}
							onHistory={() => {
								setHistoryId(selected);
								setSelected(null);
							}}
						/>
					) : (
						<Empty title="选一封邮件，开始阅读" description="在左侧查看你的来信与往来记录。" />
					)}
				</section>
			</main>
			{compose && (
				<Compose
					boxes={boxes}
					initial={box?.canSend && box.enabled && box.domainEnabled ? box.id : undefined}
					reply={reply}
					onClose={() => setCompose(false)}
					onSent={() => void update()}
				/>
			)}
		</div>
	);
}
function MessageView({
	id,
	box,
	onBack,
	onChange,
	onReply,
	onHistory,
}: {
	id: string;
	box: Mailbox | undefined;
	onBack: () => void;
	onChange: () => Promise<void>;
	onReply: (m: MessageDetail) => void;
	onHistory: () => void;
}) {
	const [message, setMessage] = useState<MessageDetail | null>(null),
		[error, setError] = useState(''),
		[busy, setBusy] = useState(false),
		[doc, setDoc] = useState(''),
		[frameReady, setFrameReady] = useState(false);
	useEffect(() => {
		let active = true;
		api<MessageDetail>(`/messages/${id}`)
			.then(async (m) => {
				if (!active) return;
				setMessage(m);
				if (!m.isRead) {
					await api(`/messages/${id}`, json('PATCH', { isRead: true }));
					if (active) {
						setMessage({ ...m, isRead: true });
						void onChange();
					}
				}
			})
			.catch((e) => {
				if (active) setError(errorText(e));
			});
		return () => {
			active = false;
		};
	}, [id]);
	useEffect(() => {
		let active = true;
		const urls: string[] = [];
		if (!message) return;
		void (async () => {
			const document = new DOMParser().parseFromString(message.html, 'text/html');
			for (const file of message.attachments.filter((f) => f.contentId)) {
				const response = await fetch(`/api/attachments/${file.id}`);
				if (!response.ok) continue;
				const url = URL.createObjectURL(await response.blob());
				urls.push(url);
				for (const img of document.querySelectorAll('img'))
					if (img.getAttribute('src') === `cid:${file.contentId}`) img.setAttribute('src', url);
			}
			if (active) setDoc('<!doctype html>' + document.documentElement.outerHTML);
			else urls.forEach(URL.revokeObjectURL);
		})().catch(() => {
			if (active) setDoc(message.html);
		});
		return () => {
			active = false;
			urls.forEach(URL.revokeObjectURL);
		};
	}, [message]);
	async function change(values: Partial<Pick<Message, 'isRead' | 'isTrash' | 'isArchive'>>) {
		setBusy(true);
		try {
			await api(`/messages/${id}`, json('PATCH', values));
			setMessage((old) => (old ? { ...old, ...values } : old));
			await onChange();
		} catch (e) {
			setError(errorText(e));
		} finally {
			setBusy(false);
		}
	}
	if (!message)
		return (
			<>
				{error && <Notice error>{error}</Notice>}
				<Empty
					title={error ? '暂时无法阅读' : '正在打开邮件…'}
					description={error ? '请检查权限或刷新页面重试。' : '正在载入正文与附件。'}
				/>
			</>
		);
	return (
		<div className="message-detail">
			<div className="detail-toolbar">
				<Button variant="tertiary" size="sm" className="mobile-back" onPress={onBack}>
					<ArrowLeft size={16} />
					返回
				</Button>
				<div className="toolbar-actions">
					<Button
						size="sm"
						variant="tertiary"
						aria-label={message.isArchive ? '取消归档' : '归档邮件'}
						isDisabled={busy}
						onPress={() => void change({ isArchive: !message.isArchive })}
					>
						{message.isArchive ? <Undo2 size={19} /> : <Archive size={19} />}
						<span>{message.isArchive ? '取消归档' : '归档'}</span>
					</Button>
					<Button
						size="sm"
						variant="tertiary"
						aria-label={message.isTrash ? '移出垃圾箱' : '移入垃圾箱'}
						isDisabled={busy}
						onPress={() => void change({ isTrash: !message.isTrash })}
					>
						{message.isTrash ? <Undo2 size={19} /> : <Trash2 size={19} />}
						<span>{message.isTrash ? '移出垃圾箱' : '移入垃圾箱'}</span>
					</Button>
					<Button
						size="sm"
						variant="tertiary"
						aria-label={message.isRead ? '标为未读' : '标为已读'}
						isDisabled={busy}
						onPress={() => void change({ isRead: !message.isRead })}
					>
						{message.isRead ? <Mail size={19} /> : <MailOpen size={19} />}
						<span>{message.isRead ? '标为未读' : '标为已读'}</span>
					</Button>
				</div>
				<Button variant="tertiary" size="sm" className="history-button" onPress={onHistory}>
					<History size={16} />
					会话记录
				</Button>
			</div>
			{error && <Notice error>{error}</Notice>}
			<div className="detail-scroll">
				<div className="detail-heading">
					<h2>{message.subject || '（无主题）'}</h2>
					<div className="sender-block">
						<div className="message-avatar">{(message.from.name || message.from.email).slice(0, 1).toUpperCase()}</div>
						<div>
							<strong>{message.from.name || message.from.email}</strong>
							<p>{message.from.email}</p>
						</div>
						<time>{displayDate(message.date)}</time>
					</div>
					<div className="recipients">
						<p>收件人：{message.to.map((a) => a.email).join(', ')}</p>
						{!!message.cc.length && <p>抄送：{message.cc.map((a) => a.email).join(', ')}</p>}
						{!!message.bcc.length && <p>密送：{message.bcc.map((a) => a.email).join(', ')}</p>}
					</div>
					{message.sendState && (
						<span className={`state-tag ${message.sendState === 'accepted' ? 'accepted' : ''}`}>
							{message.sendState === 'accepted'
								? '平台已接受 · 不代表最终送达'
								: message.sendState === 'failed'
									? `发送失败 · ${message.errorCode}`
									: message.sendState === 'pending'
										? '正在提交'
										: '结果不确定 · 请勿重复发送'}
						</span>
					)}
				</div>
				{doc ? (
					<iframe
						key={doc}
						title="邮件正文"
						sandbox="allow-popups allow-popups-to-escape-sandbox"
						srcDoc={doc}
						className="email-frame"
						data-ready={frameReady}
						onLoad={() => setFrameReady(true)}
					/>
				) : (
					<p className="body-loading" role="status">
						正在排版正文…
					</p>
				)}
				<div className="attachments">
					{message.attachments.map((file) => (
						<a
							key={file.id}
							href={`/api/attachments/${file.id}`}
							className="attachment"
							download
							onClick={(event) => {
								if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
								event.preventDefault();
								void downloadAttachment(file.id, file.filename).catch((e) => setError(errorText(e)));
							}}
						>
							<FileText className={/\.pdf$/i.test(file.filename) ? 'file-pdf' : 'file-icon'} size={30} />
							<span>
								{file.filename}
								<small>{formatSize(file.size)}</small>
							</span>
							<Download size={21} className="attachment-download" />
						</a>
					))}
				</div>
				<div className="reply-area">
					<Button
						size="sm"
						variant="secondary"
						isDisabled={!box?.canSend || !box.enabled || !box.domainEnabled}
						onPress={() => onReply(message)}
					>
						<Reply size={17} />
						回复
					</Button>
				</div>
			</div>
		</div>
	);
}

function formatSize(size: number) {
	return size >= 1024 * 1024 ? `${(size / (1024 * 1024)).toFixed(1)} MB` : `${(size / 1024).toFixed(1)} KB`;
}
