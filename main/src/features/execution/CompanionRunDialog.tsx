import { useEffect, useRef, useState } from 'react';
import { Play, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { companionIssue, type LearningCompanion } from '../../../shared/learning-companion';
import type { SkillEntry } from '../../../shared/marketplace';
import type { Trial } from '../../../shared/execution';
import { isCompanionCaseMethod } from '../../../shared/companion-cases';
import { executionApi, failureMessage, methodInput, serviceConfigured } from './api';
import { useVerification } from './useVerification';
import './companion-run-dialog.css';

export function CompanionRunDialog({ value, skills, onClose, onPublished, onCheck, onEdit }: {
  value: LearningCompanion; skills: SkillEntry[]; onClose: () => void;
  onPublished: (trial: Trial) => void; onCheck: (entry: SkillEntry) => void; onEdit: () => void;
}) {
  const verification = useVerification();
  const selected = [...new Map(skills.filter(entry => value.skillIds.includes(entry.id)).map(entry => [entry.id, entry])).values()];
  const issue = companionIssue(value, skills);
  const missing = selected.filter(entry => !isCompanionCaseMethod(value, methodInput(entry)) && !verification.verified(entry));
  const [hours, setHours] = useState('24');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const alive = useRef(true);
  const submitting = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const duration = Number(hours);
  const valid = Number.isInteger(duration) && duration >= 1 && duration <= 168;
  async function publish() {
    if (submitting.current || !valid || issue || missing.length || serviceConfigured || verification.error) return;
    submitting.current = true; setBusy(true); setError('');
    try {
      const { trial } = await executionApi<{ trial: Trial }>('/trials', { companion: value, methods: selected.map(methodInput), hours: duration, capacity: 1 });
      if (alive.current) onPublished(trial);
    } catch (reason) { if (alive.current) setError(failureMessage(reason)); }
    finally { submitting.current = false; if (alive.current) setBusy(false); }
  }
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <DialogContent className="companion-run-dialog" showCloseButton={!busy} onEscapeKeyDown={event => { if (busy) event.preventDefault(); }} onPointerDownOutside={event => { if (busy) event.preventDefault(); }}>
      <DialogHeader><DialogTitle><Play aria-hidden="true" />发布学伴运行</DialogTitle><DialogDescription>为“{value.name}”创建运行记录，发布后进入运行报告。</DialogDescription></DialogHeader>
      <div className="run-summary"><strong>{value.name}</strong><p>{[value.grade, value.subject, value.year].filter(Boolean).join(' · ')}</p><p>教学方法：{selected.map(entry => entry.skill.name).join('、') || '尚未添加'}</p></div>
      <label className="form-field"><span><Clock aria-hidden="true" />运行时长（小时）</span><input type="number" min="1" max="168" step="1" value={hours} disabled={busy} onChange={event => setHours(event.target.value)} /><small>可设置 1～168 小时；再次发布会结束当前运行，历史记录保留。</small></label>
      {!valid && <p role="alert">请输入 1～168 之间的整数小时。</p>}
      {issue && <div role="alert"><p>{issue}</p><Button variant="outline" onClick={onEdit}>完善学伴信息</Button></div>}
      {!!missing.length && <div className="run-method-gate"><p>发布前，请先核对以下教学方法：</p>{missing.map(entry => <Button key={entry.id} variant="outline" onClick={() => onCheck(entry)}>核对：{entry.skill.name}</Button>)}</div>}
      {serviceConfigured && <p role="alert">当前服务模式请使用原有受控试用入口。</p>}
      {(error || verification.error) && <p role="alert" className="execution-error">{error || verification.error}</p>}
      <div className="run-dialog-actions"><Button variant="outline" disabled={busy} onClick={onClose}>取消</Button><Button disabled={busy || !valid || !!issue || !!missing.length || serviceConfigured || !!verification.error} onClick={() => void publish()}>{busy ? '正在发布…' : '发布运行'}</Button></div>
    </DialogContent>
  </Dialog>;
}
