import { accountSessionKey } from '../../shared/local-accounts';
import { accountWorkspaceKey } from './account-workspace';

function preferenceKey(key: string) {
  const session = JSON.parse(sessionStorage.getItem(accountSessionKey) || 'null');
  return typeof session?.accountId === 'string' ? accountWorkspaceKey(session.accountId, key) : key;
}
// 列表偏好保存失败时仍允许浏览；教师作品的持久化错误由各工作区单独处理。
export function readSession(key: string) {
  try { return sessionStorage.getItem(preferenceKey(key)); } catch { return null; }
}
export function writeSession(key: string, value: string) {
  try { sessionStorage.setItem(preferenceKey(key), value); } catch { /* 不影响当前筛选与滚动。 */ }
}
