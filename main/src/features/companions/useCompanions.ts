import { useRef, useState } from 'react';
import { companionsKey, readCompanions, type LearningCompanion } from '../../../shared/learning-companion';
import type { WorkspaceStorage } from '@/lib/account-workspace';

export function useCompanions(storage: WorkspaceStorage) {
  const [initial] = useState(() => {
    try { return { items: readCompanions(storage.getItem(companionsKey)), error: '' }; }
    catch { return { items: [], error: '学伴资料读取失败，原资料已保留。请检查浏览器存储后刷新。' }; }
  });
  const [items, setItems] = useState(initial.items);
  const current = useRef(items);
  const [error, setError] = useState(initial.error);
  function save(value: LearningCompanion) {
    if (initial.error) return false;
    const saved = { ...value, skillIds: [...new Set(value.skillIds)], updatedAt: new Date().toISOString() };
    const next = [saved, ...current.current.filter(item => item.id !== saved.id)];
    try { storage.setItem(companionsKey, JSON.stringify(next)); }
    catch { setError('学伴未保存，当前填写内容仍保留。请减少附件或释放存储空间后重试。'); return false; }
    current.current = next; setItems(next); setError(''); return true;
  }
  return { items, error, save };
}
