// 列表偏好保存失败时仍允许浏览；教师作品的持久化错误由各工作区单独处理。
export function readSession(key: string) {
  try { return sessionStorage.getItem(key); } catch { return null; }
}
export function writeSession(key: string, value: string) {
  try { sessionStorage.setItem(key, value); } catch { /* 不影响当前筛选与滚动。 */ }
}
