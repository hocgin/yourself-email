import { useEffect, useRef, useState } from 'react';
import { Button, Modal } from '@heroui/react';
import { Paperclip, Send, X } from 'lucide-react';
import { api, errorText, json, HttpError } from './api';
import { Field, Notice, SelectField } from './ui';
import type { Attachment, Mailbox, MessageDetail, SendInput, SendResult } from '../shared/contracts';
const statuses = { pending: '正在提交', accepted: 'Cloudflare 已接受', failed: '发送失败', unknown: '结果不确定' };
export function Compose({
	boxes,
	initial,
	reply,
	onClose,
	onSent,
}: {
	boxes: Mailbox[];
	initial?: string;
	reply?: MessageDetail;
	onClose: () => void;
	onSent: () => void;
}) {
	const enabled = boxes.filter((b) => b.canSend && b.enabled && b.domainEnabled),
		[mailboxId, setMailbox] = useState(reply?.mailboxId || initial || enabled[0]?.id || ''),
		[to, setTo] = useState(
			reply ? (reply.direction === 'inbound' ? reply.replyTo[0]?.email || reply.from.email : reply.to.map((a) => a.email).join(', ')) : '',
		),
		[cc, setCc] = useState(''),
		[bcc, setBcc] = useState(''),
		[subject, setSubject] = useState(reply ? `Re: ${reply.subject.replace(/^Re:\s*/i, '')}` : ''),
		[text, setText] = useState(''),
		[files, setFiles] = useState<Attachment[]>([]),
		[busy, setBusy] = useState(false),
		[uploading, setUploading] = useState(false),
		[error, setError] = useState(''),
		[result, setResult] = useState<SendResult | null>(null),
		[attempted, setAttempted] = useState(false);
	const key = useRef(crypto.randomUUID()),
		snapshot = useRef<SendInput | null>(null),
		fileInput = useRef<HTMLInputElement>(null);
	useEffect(() => {
		if (!result || result.status !== 'pending') return;
		const timer = setInterval(
			() =>
				void api<SendResult>(`/messages/send/${result.id}`)
					.then(setResult)
					.catch((e) => setError(errorText(e))),
			2000,
		);
		return () => clearInterval(timer);
	}, [result]);
	function recipients(value: string) {
		return value
			.split(/[,;\n]+/)
			.map((s) => s.trim())
			.filter(Boolean)
			.map((email) => ({ email }));
	}
	async function send() {
		setBusy(true);
		setError('');
		try {
			if (!snapshot.current)
				snapshot.current = {
					mailboxId,
					to: recipients(to),
					cc: recipients(cc),
					bcc: recipients(bcc),
					subject,
					text,
					attachmentIds: files.map((f) => f.id),
					...(reply ? { replyToId: reply.id } : {}),
				};
			setAttempted(true);
			const res = await api<SendResult>('/messages/send', {
				...json('POST', snapshot.current),
				headers: { 'Idempotency-Key': key.current },
			});
			setResult(res);
			if (res.status === 'accepted') onSent();
		} catch (e) {
			setError(errorText(e));
			if (e instanceof HttpError && e.status >= 400 && e.status < 500) {
				setAttempted(false);
				snapshot.current = null;
				key.current = crypto.randomUUID();
			}
		} finally {
			setBusy(false);
		}
	}
	async function upload(list: FileList | null) {
		if (!list) return;
		setUploading(true);
		setError('');
		try {
			for (const file of Array.from(list)) {
				const form = new FormData();
				form.set('mailboxId', mailboxId);
				form.set('file', file);
				const attachment = await api<Attachment>('/attachments', { method: 'POST', body: form });
				setFiles((old) => [...old, attachment]);
			}
		} catch (e) {
			setError(errorText(e));
		} finally {
			setUploading(false);
			if (fileInput.current) fileInput.current.value = '';
		}
	}
	const locked = attempted || busy;
	return (
		<Modal
			isOpen
			onOpenChange={(open) => {
				if (!open && !busy && !uploading) onClose();
			}}
		>
			<Modal.Backdrop>
				<Modal.Container>
					<Modal.Dialog className="compose-dialog">
						<Modal.Header>
							<div className="eyebrow">NEW MESSAGE</div>
							<Modal.Heading>{reply ? '回复邮件' : '写一封新邮件'}</Modal.Heading>
						</Modal.Header>
						<Modal.Body>
							<form
								id="compose-form"
								onSubmit={(e) => {
									e.preventDefault();
									void send();
								}}
							>
								<fieldset disabled={locked || uploading} className="compose-fields">
									<SelectField
										label="发件邮箱"
										value={mailboxId}
										onChange={(value) => {
											setMailbox(value);
											setFiles([]);
										}}
										disabled={!!reply || locked || uploading}
										options={enabled.map((b) => ({ id: b.id, label: b.address }))}
									/>

									<Field label="收件人" value={to} onChange={setTo} placeholder="name@example.com，多个地址用英文逗号分隔" required />
									<div className="two-col">
										<Field label="抄送" value={cc} onChange={setCc} />
										<Field label="密送" value={bcc} onChange={setBcc} />
									</div>
									<Field label="主题" value={subject} onChange={setSubject} />
									<Field label="正文" value={text} onChange={setText} multiline placeholder="从这里开始你的邮件…" />
									<input
										ref={fileInput}
										type="file"
										multiple
										className="sr-only"
										aria-label="上传附件"
										onChange={(e) => void upload(e.target.files)}
									/>
									<Button variant="secondary" size="sm" onPress={() => fileInput.current?.click()} isDisabled={!mailboxId || uploading}>
										<Paperclip size={15} />
										{uploading ? '正在上传…' : '添加附件'}
									</Button>
									<span className="muted small">单个附件 ≤18 MiB · 整封邮件含编码 ≤25 MiB · 收件人合计 ≤50</span>
									<div className="file-chips">
										{files.map((f) => (
											<span key={f.id}>
												{f.filename}
												<Button
													variant="ghost"
													size="sm"
													isIconOnly
													aria-label={`移除 ${f.filename}`}
													onPress={() => setFiles((old) => old.filter((x) => x.id !== f.id))}
												>
													<X size={13} />
												</Button>
											</span>
										))}
									</div>
								</fieldset>
							</form>
							{error && (
								<Notice error>
									{error}
									{attempted && !result && <p>可用同一发送键查询／继续本次请求，请勿重新创建相同邮件。</p>}
								</Notice>
							)}
							{result && (
								<Notice error={result.status === 'failed' || result.status === 'unknown'}>
									<strong>{statuses[result.status]}</strong>
									<p>
										{result.status === 'accepted'
											? '平台已接收发送请求，此状态不代表最终送达。'
											: result.status === 'unknown'
												? '可能已经提交成功，不会自动重发，请先确认收件结果。'
												: result.status === 'pending'
													? '请稍候，正在检查发送状态。'
													: `错误代码：${result.errorCode || '未知'}。请检查域名接入、收件地址或稍后重试。`}
									</p>
								</Notice>
							)}
						</Modal.Body>
						<Modal.Footer>
							<Button size="sm" variant="tertiary" onPress={onClose} isDisabled={busy || uploading}>
								{result?.status === 'accepted' ? '完成' : '关闭'}
							</Button>
							{result?.status === 'failed' && (
								<Button
									size="sm"
									variant="secondary"
									onPress={() => {
										key.current = crypto.randomUUID();
										snapshot.current = null;
										setAttempted(false);
										setResult(null);
									}}
								>
									修改邮件
								</Button>
							)}
							{(!result || result.status === 'failed') && (
								<Button
									size="sm"
									isDisabled={busy || uploading || !mailboxId}
									onPress={() => {
										if (result?.status === 'failed') {
											key.current = crypto.randomUUID();
											setResult(null);
										}
										void send();
									}}
								>
									<Send size={16} />
									{busy ? '正在发送…' : result?.status === 'failed' ? '重新发送' : attempted ? '检查本次发送' : '发送邮件'}
								</Button>
							)}
						</Modal.Footer>
					</Modal.Dialog>
				</Modal.Container>
			</Modal.Backdrop>
		</Modal>
	);
}
