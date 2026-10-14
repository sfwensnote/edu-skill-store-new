import type { MethodInput } from '../../../shared/execution';
import type { MethodChatMessage } from '../../../shared/method-chat';

export type MethodModelStatus = { ready: boolean; model: string };
async function request<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  if (import.meta.env.VITE_METHOD_CHAT_ENABLED !== 'true') throw new Error('当前网站尚未连接模型服务，请使用本机工作台。');
  const response = await fetch(`/api/method-chat${path}`, { method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body),
    signal: signal || AbortSignal.timeout(130000) });
  const result = await response.json().catch(() => { throw new Error('模型服务未返回有效数据，请检查工作台连接。'); });
  if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : '对话未完成，请重试。');
  return result as T;
}
export const methodModelStatus = () => request<MethodModelStatus>('/status');
export const methodModelTurn = (method: MethodInput, messages: MethodChatMessage[], signal: AbortSignal) =>
  request<{ content: string; model: string; fingerprint: string }>('/turn', { method, messages: messages.map(({ role, content }) => ({ role, content })) }, signal);
