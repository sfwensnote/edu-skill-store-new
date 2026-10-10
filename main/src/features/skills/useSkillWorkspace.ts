import { useEffect, useRef, useState } from 'react';
import { readSkillWorkspace, skillWorkspaceKey, type SkillRecord, type SkillWorkspace } from '../../../shared/skill-workspace';

function load() {
  try {
    return { workspace: readSkillWorkspace(localStorage.getItem(skillWorkspaceKey)), error: '', blocked: false };
  } catch {
    return { workspace: { version: 1, skills: [] } as SkillWorkspace,
      error: '无法读取本机 SKILL 资料。原资料未被覆盖，请检查浏览器存储后重试。', blocked: true };
  }
}

export function useSkillWorkspace(hash: string) {
  const [initial] = useState(load);
  const [workspace, setWorkspace] = useState(initial.workspace);
  const [error, setError] = useState(initial.error);
  const [dirty, setDirty] = useState(false);
  const current = useRef(workspace);
  const blocked = useRef(initial.blocked);
  const previousHash = useRef(hash);
  useEffect(() => { previousHash.current = hash; }, [hash]);

  function persist(next: SkillWorkspace, preserveInput = false) {
    if (blocked.current) return false;
    try {
      localStorage.setItem(skillWorkspaceKey, JSON.stringify(next));
      current.current = next;
      setWorkspace(next);
      setError('');
      setDirty(false);
      return true;
    } catch {
      if (preserveInput) {
        current.current = next;
        setWorkspace(next);
        setDirty(true);
      }
      setError('保存失败，输入仍保留在当前页面。请检查浏览器存储后重试保存。');
      return false;
    }
  }

  function saveRecord(record: SkillRecord, preserveInput = false) {
    const skills = current.current.skills.some((item) => item.id === record.id)
      ? current.current.skills.map((item) => item.id === record.id ? record : item)
      : [...current.current.skills, record];
    return persist({ version: 1, skills }, preserveInput);
  }

  function retry() {
    if (blocked.current) {
      const result = load();
      blocked.current = result.blocked;
      current.current = result.workspace;
      setWorkspace(result.workspace);
      setError(result.error);
      return !result.blocked;
    }
    return persist(current.current);
  }

  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    const protectHash = () => {
      // 在路由切换前恢复地址，保存失败时不卸载编辑页。
      window.history.replaceState(null, '', previousHash.current || '#/home');
      setError('当前输入尚未保存，请先重试保存，再离开页面。');
    };
    window.addEventListener('beforeunload', beforeUnload);
    window.addEventListener('hashchange', protectHash, true);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      window.removeEventListener('hashchange', protectHash, true);
    };
  }, [dirty]);

  return { skills: workspace.skills, error, dirty, saveRecord, retry };
}
