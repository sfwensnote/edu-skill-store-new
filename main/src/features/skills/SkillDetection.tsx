import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { hasSkillChanges, isSkillReviewed, type SkillRecord } from '../../../shared/skill-workspace';
import type { SkillDetection } from '../../../shared/skill-detection';
import { makeSkillDetectionCases, runDemoDetection } from './demo-detection';

export function SkillDetectionPage({ record, save }: {
  record: SkillRecord; save: (record: SkillRecord, preserveInput?: boolean) => boolean;
}) {
  const [cases, setCases] = useState(() => (record.detectionDraft?.cases || record.detection?.cases || makeSkillDetectionCases(record))
    .map(({ id, name, input, expected }) => ({ id, name, input, expected })));
  const [outcome, setOutcome] = useState<'pass' | 'review'>('pass');
  const [result, setResult] = useState<SkillDetection | undefined>(record.detection);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [unsaved, setUnsaved] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const eligible = isSkillReviewed(record) && !hasSkillChanges(record);
  useEffect(() => () => controller.current?.abort(), []);
  function store(detection: SkillDetection) {
    const ok = save({ ...record, detection, publication: undefined, updatedAt: new Date().toISOString() });
    setUnsaved(!ok);
    return ok;
  }
  async function run() {
    setError(''); setBusy(true); setUnsaved(false); setResult(undefined);
    const abort = new AbortController();
    controller.current = abort;
    // 重新检测前撤回旧检测与发布状态，失败不能沿用旧的通过结果。
    if (!save({ ...record, detection: undefined, publication: undefined })) { setBusy(false); return; }
    try {
      const detection = await runDemoDetection(record, cases, outcome, abort.signal);
      if (abort.signal.aborted) return;
      setResult(detection);
      store(detection);
    } catch (cause) {
      if (!abort.signal.aborted) setError(cause instanceof Error ? cause.message : '检测失败，请重试。');
    } finally { if (!abort.signal.aborted) setBusy(false); }
  }
  function changeCase(index: number, value: string) {
    const next = cases.map((item, i) => i === index ? { ...item, input: value } : item);
    setCases(next); setResult(undefined); setUnsaved(false);
    save({ ...record, detectionDraft: { revision: record.revision, cases: next },
      detection: undefined, publication: undefined }, true);
  }
  const passed = result?.cases.every((item) => item.status === 'pass');
  return <>
    <div className="sd-page-heading"><div><h1>LLM 检测</h1>
      <p>检查 v{record.revision} 在教学情境中的回答，是否遵守方法与边界。</p></div>
      <span className="sd-meta">检测模型已接入（Demo）</span></div>
    <p className="sd-footnote sd-detection-notice">本页模拟 LLM 检测返回，展示输入、回答与检测意见。结果为演示数据。</p>
    {!eligible && <p className="sd-error">请先形成并完成当前版本的教师核对，再运行检测。</p>}
    <div className="sd-detection-toolbar">
      <label htmlFor="detection-outcome">检测演示情境</label>
      <select id="detection-outcome" value={outcome} disabled={busy} onChange={(event) => setOutcome(event.target.value as 'pass' | 'review')}>
        <option value="pass">模型按方法回答</option><option value="review">模型在信息不足时越界</option>
      </select>
      <Button onClick={run} disabled={!eligible || busy || cases.some((item) => !item.input.trim())}>
        {busy ? '正在检测…' : '运行 LLM 检测'}</Button>
    </div>
    <section className="sd-detection-cases" aria-label="检测情境" aria-busy={busy}>
      {cases.map((item, index) => {
        const checked = result?.cases.find((entry) => entry.id === item.id);
        return <article key={item.id}>
          <header><h2>{item.name}</h2>{checked && <span className="sd-meta">{checked.status === 'pass' ? '演示检测通过' : '需要调整'}</span>}</header>
          <label htmlFor={`test-input-${item.id}`}>测试输入</label>
          <Textarea id={`test-input-${item.id}`} maxLength={2000} value={item.input} disabled={busy}
            onChange={(event) => changeCase(index, event.target.value)} />
          <dl><div><dt>预期行为</dt><dd>{item.expected}</dd></div>
            {checked && <><div><dt>模型回答（演示）</dt><dd>{checked.output}</dd></div>
              <div><dt>检测意见（演示）</dt><dd>{checked.reason}</dd></div></>}</dl>
        </article>;
      })}
    </section>
    {error && <p className="sd-error" role="alert">{error}</p>}
    {result && <div className="sd-detection-complete" role="status">
      <p>{unsaved ? '检测结果尚未保存，请重试。' : passed ? '当前版本的演示检测通过，可继续发布。' : '检测发现问题，请修订方法后重新核对与检测。'}</p>
      {unsaved ? <Button onClick={() => store(result)}>重试保存检测结果</Button> : passed ?
        <Button asChild><a href={`#/skills/${encodeURIComponent(record.id)}/publish`}>继续发布</a></Button> :
        <Button variant="outline" asChild><a href={`#/skills/${encodeURIComponent(record.id)}/edit`}>返回修订</a></Button>}
    </div>}
  </>;
}
