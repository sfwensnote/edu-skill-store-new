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
  function persist(next: LearningCompanion[], failure: string) {
    if (initial.error) return false;
    try { storage.setItem(companionsKey, JSON.stringify(next)); }
    catch { setError(failure); return false; }
    current.current = next; setItems(next); setError(''); return true;
  }
  function save(value: LearningCompanion) {
    const saved = { ...value, skillIds: [...new Set(value.skillIds)], updatedAt: new Date().toISOString() };
    const next = [saved, ...current.current.filter(item => item.id !== saved.id)];
    return persist(next, '学伴未保存，当前填写内容仍保留。请减少附件或释放存储空间后重试。');
  }
  function copy(id: string) {
    const source = current.current.find(item => item.id === id);
    if (!source) return false;
    const draft = { ...structuredClone(source), id: crypto.randomUUID(), name: `${(source.name || '未命名学伴').slice(0, 46)}（副本）`,
      status: 'draft' as const, step: 1 as const, updatedAt: new Date().toISOString() };
    return persist([draft, ...current.current], '复制未保存，请减少附件或释放存储空间后重试。');
  }
  function remove(id: string) {
    if (!current.current.some(item => item.id === id)) return false;
    return persist(current.current.filter(item => item.id !== id), '删除未保存，学伴仍保留。请释放存储空间后重试。');
  }
  return { items, error, save, copy, remove };
}
