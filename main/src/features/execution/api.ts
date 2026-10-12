import type { SkillEntry } from '../../../shared/marketplace';
import type { Verification } from '../../../shared/execution';
import { compileSkillInstructions } from '../../../shared/skill-preview';
import { browserPreviewApi } from './preview-runtime';

const apiBase = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
export const serviceConfigured = import.meta.env.VITE_SERVICE_MODE !== 'preview' && Boolean(apiBase || import.meta.env.VITE_SERVICE_MODE === 'server');
export const serviceTokenKey = 'teaching-workshop.server-session';
export function serviceIssue() { return '检测与试用服务尚未连接，请联系管理员配置后端。'; }
export async function api<T>(path: string, body?: unknown, options: { method?: string; token?: string; public?: boolean } = {}): Promise<T> {
  if (!serviceConfigured) throw new Error(serviceIssue());
  const token = options.token ?? (options.public ? '' : sessionStorage.getItem(serviceTokenKey) || '');
  const response = await fetch(`${apiBase}/api${path}`, {
    method: options.method || (body === undefined ? 'GET' : 'POST'), credentials: apiBase ? 'omit' : 'same-origin',
    headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(180000),
  }).catch(() => { throw new Error('服务连接失败，请检查网络后重试。'); });
  const result = await response.json().catch(() => { throw new Error('服务未返回有效数据，请联系管理员。'); });
  if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : '操作失败，请重试。');
  return result as T;
}
export async function executionApi<T>(path: string, body?: unknown, options?: Parameters<typeof api>[2]): Promise<T> {
  return serviceConfigured ? api<T>(`/execution${path}`, body, options) : browserPreviewApi<T>(path, body);
}
export const methodInput = (entry: SkillEntry) => ({ entryId: entry.id, skill: entry.skill });
export function isVerified(entry: SkillEntry, proofs: Verification[]) {
  return proofs.some(proof => proof.entryId === entry.id && compileSkillInstructions(proof.skill) === compileSkillInstructions(entry.skill));
}
export function executionChanged() { window.dispatchEvent(new Event('execution-changed')); }
export function failureMessage(error: unknown) { return error instanceof Error ? error.message : '操作未完成，请重试。'; }
