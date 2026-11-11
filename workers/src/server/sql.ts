import { ApiError, type Bindings } from './core';
export const stmt = (env: Bindings, query: string, ...values: unknown[]) => env.DB.prepare(query).bind(...values);
export async function rows<T>(env: Bindings, query: string, ...values: unknown[]): Promise<T[]> {
	return (await stmt(env, query, ...values).all<T>()).results;
}
export async function one<T>(env: Bindings, query: string, ...values: unknown[]): Promise<T> {
	const row = await stmt(env, query, ...values).first<T>();
	if (!row) throw new ApiError(404, 'NOT_FOUND', '资源不存在或无权访问');
	return row;
}
export function stableJson(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
	if (value && typeof value === 'object')
		return `{${Object.entries(value)
			.filter(([, v]) => v !== undefined)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([k, v]) => `${JSON.stringify(k)}:${stableJson(v)}`)
			.join(',')}}`;
	return JSON.stringify(value);
}
