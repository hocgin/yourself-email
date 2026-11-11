import { Button, Input, Label, TextArea, TextField, Checkbox, Select, ListBox } from '@heroui/react';
import { Mail, RefreshCw } from 'lucide-react';
export function Field({
	label,
	value,
	onChange,
	placeholder,
	type = 'text',
	multiline = false,
	required = false,
}: {
	label: string;
	value: string;
	onChange: (v: string) => void;
	placeholder?: string;
	type?: string;
	multiline?: boolean;
	required?: boolean;
}) {
	return (
		<TextField value={value} onChange={onChange} type={type} isRequired={required} className="field">
			<Label>{label}</Label>
			{multiline ? <TextArea rows={8} placeholder={placeholder} /> : <Input placeholder={placeholder} />}
		</TextField>
	);
}
export function SelectField({
	label,
	value,
	onChange,
	options,
	placeholder,
	disabled = false,
	hideLabel = false,
	className = '',
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	options: { id: string; label: string }[];
	placeholder?: string;
	disabled?: boolean;
	hideLabel?: boolean;
	className?: string;
}) {
	return (
		<Select
			aria-label={hideLabel ? label : undefined}
			value={value || null}
			onChange={(key) => onChange(key == null ? '' : String(key))}
			isDisabled={disabled}
			placeholder={placeholder}
			className={`field compact-select ${className}`}
		>
			{!hideLabel && <Label>{label}</Label>}
			<Select.Trigger className="h-8 min-h-8 rounded-lg px-3 text-sm">
				<Select.Value className="truncate" />
				<Select.Indicator />
			</Select.Trigger>
			<Select.Popover>
				<ListBox>
					{options.map((option) => (
						<ListBox.Item key={option.id} id={option.id} textValue={option.label}>
							{option.label}
							<ListBox.ItemIndicator />
						</ListBox.Item>
					))}
				</ListBox>
			</Select.Popover>
		</Select>
	);
}
export function Check({
	label,
	value,
	onChange,
	compact = false,
}: {
	label: string;
	value: boolean;
	onChange: (v: boolean) => void;
	compact?: boolean;
}) {
	return (
		<Checkbox aria-label={label} isSelected={value} onChange={onChange}>
			<Checkbox.Content>
				<Checkbox.Control>
					<Checkbox.Indicator />
				</Checkbox.Control>
				<span className={compact ? 'sr-only' : undefined}>{label}</span>
			</Checkbox.Content>
		</Checkbox>
	);
}
export function Brand() {
	return (
		<div className="brand">
			<span className="brand-mark">
				<img src="/logo.webp" width={128} height={128} alt="" />
			</span>
			<div>
				Yourself<span className="brand-sub">MAIL / 私人邮件空间</span>
			</div>
		</div>
	);
}
export function Empty({ title, description }: { title: string; description: string }) {
	return (
		<div className="empty">
			<span className="empty-icon">
				<Mail size={28} />
			</span>
			<h2>{title}</h2>
			<p>{description}</p>
		</div>
	);
}
export function Notice({ error, children }: { error?: boolean; children: React.ReactNode }) {
	return (
		<div className={`notice ${error ? 'error' : ''}`} role={error ? 'alert' : 'status'}>
			{children}
		</div>
	);
}
export function Refresh({ onPress }: { onPress: () => void }) {
	return (
		<Button size="sm" variant="tertiary" isIconOnly aria-label="刷新" onPress={onPress}>
			<RefreshCw size={16} />
		</Button>
	);
}
