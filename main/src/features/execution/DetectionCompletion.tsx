import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { SkillEntry } from '../../../shared/marketplace';
import { failureMessage } from './api';

export type DetectionCompletionProps = {
  entry: SkillEntry;
  entries: SkillEntry[];
  onSelect: (id: string) => void;
  onPublish?: (entry: SkillEntry) => void;
  onFinish?: () => void;
  onConfirmed?: (entry: SkillEntry) => Promise<{ pendingIds: string[] }>;
  canPublish?: (entry: SkillEntry) => boolean;
};

type SyncStatus = 'syncing' | 'error' | 'ready';

/** 验证完成区：确认后同步核对结果、提示待核对方法，并提供发布与返回两条出口。 */
export function DetectionCompletion(props: DetectionCompletionProps) {
  const { entry, entries } = props;
  const [status, setStatus] = useState<SyncStatus>('syncing');
  const [error, setError] = useState('');
  const [pendingIds, setPendingIds] = useState<string[]>([]);

  const latest = useRef(props);
  latest.current = props;
  const requestRef = useRef(0);
  const mountedRef = useRef(true);
  const sectionRef = useRef<HTMLElement | null>(null);
  // 同一个 entryId 在同步未结束前复用这次 onConfirmed，避免 StrictMode 二次 effect 重复触发副作用导致误判“方法已修改”。
  const jobRef = useRef<{ entryId: string; promise: Promise<{ pendingIds: string[] }> } | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const runSync = useCallback(async () => {
    const request = ++requestRef.current;
    setStatus('syncing');
    setError('');
    const { onConfirmed, entry: currentEntry } = latest.current;
    if (!onConfirmed) {
      setPendingIds([]);
      setStatus('ready');
      return;
    }
    let job = jobRef.current;
    if (!job || job.entryId !== currentEntry.id) {
      const created = { entryId: currentEntry.id, promise: onConfirmed(currentEntry) };
      job = created;
      jobRef.current = created;
      // 任务 settle 后只清除仍是本次任务的记录；失败或新 entryId 都能重新创建。
      void created.promise.catch(() => undefined).finally(() => {
        if (jobRef.current === created) jobRef.current = null;
      });
    }
    try {
      const result = await job.promise;
      if (!mountedRef.current || request !== requestRef.current) return;
      setPendingIds(result.pendingIds);
      setStatus('ready');
    } catch (reason) {
      if (!mountedRef.current || request !== requestRef.current) return;
      setError(failureMessage(reason));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void runSync();
    return () => { requestRef.current += 1; };
  }, [entry.id, runSync]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    section.focus({ preventScroll: true });
    const reduceMotion = typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    section.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
  }, [entry.id]);

  const pendingEntries = entries.filter((item) => pendingIds.includes(item.id));
  const publishable = !entry.addedFrom && !!props.onPublish && (props.canPublish?.(entry) ?? false);
  const showPublish = status === 'ready' && publishable;

  return <section className="execution-complete" tabIndex={-1} ref={sectionRef} aria-label="验证完成">
    <p role="status">教师已确认，可将这项教学方法添加到学伴。</p>
    {status === 'syncing' && <p role="status">正在同步核对结果…</p>}
    {status === 'error' && <>
      <p className="execution-complete-error" role="alert">{error}</p>
      <div className="execution-complete-actions">
        <Button variant="outline" onClick={() => void runSync()}>重试同步</Button>
      </div>
    </>}
    {status === 'ready' && pendingEntries.length > 0 && <>
      <div className="execution-complete-pending">
        <p role="status">还有 {pendingEntries.length} 项方法需要核对：</p>
        <ul>{pendingEntries.map((item) => <li key={item.id}>{item.skill.name}</li>)}</ul>
      </div>
      <div className="execution-complete-actions">
        <Button onClick={() => props.onSelect(pendingIds[0])}>继续核对其它方法</Button>
      </div>
    </>}
    <div className="execution-complete-actions">
      {showPublish && <Button onClick={() => props.onPublish?.(entry)}>发布到集市</Button>}
      {props.onFinish && (
        <Button variant="outline" onClick={props.onFinish}>
          {showPublish ? '先不发布，返回我的教学方法' : '返回我的教学方法'}
        </Button>
      )}
    </div>
  </section>;
}
