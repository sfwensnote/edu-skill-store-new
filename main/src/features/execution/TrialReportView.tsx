import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { reviewSchema, type TrialReport, type TrialSession } from '../../../shared/execution';
import { executionApi, failureMessage } from './api';
import { Transcript } from './Transcript';

const aspectLabels = { learning: '学生学习表现', skill: '教学方法执行情况', runtime: '学伴运行问题' };
const decisions = { 'meets-expectations': '符合预期', 'adjust-scene': '调整学习场景', 'modify-skill': '修改教学方法', 'expand-trial': '扩大试用范围' };
export function TrialReportView({ initial, sessions, onEdit, onMethods }: {
  initial: TrialReport; sessions: TrialSession[]; onEdit: () => void; onMethods: () => void;
}) {
  const [report, setReport] = useState(initial);
  const [evidence, setEvidence] = useState<{ session: TrialSession; ids: string[] } | null>(null);
  const [decision, setDecision] = useState<keyof typeof decisions>(report.review?.decision || 'meets-expectations');
  const [note, setNote] = useState(report.review?.note || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <section className="execution-report" aria-label="回收报告">
    <h2>回收报告</h2><p>{report.studentCount} 位学生 · {report.turnCount} 轮学伴回复</p>
    <p className="execution-limitation">{report.limitation}</p>
    {Object.entries(aspectLabels).map(([aspect, label]) => <section key={aspect}><h3>{label}</h3>
      {!report.findings.some(item => item.aspect === aspect) && <p className="subtle">暂无足够证据形成结论。</p>}
      {report.findings.filter(item => item.aspect === aspect).map((item, index) => <article className="execution-finding" key={index}>
        <p>{item.severity === 'concern' && <strong>需要核对 · </strong>}{item.description}</p>
        {item.evidence.map((quote, i) => <blockquote key={i}>{quote.quote}</blockquote>)}
        <Button variant="link" onClick={() => {
          const session = sessions.find(session => item.evidence.some(e => session.messages.some(message => message.id === e.messageId)));
          if (session) setEvidence({ session, ids: item.evidence.map(e => e.messageId) });
        }}>查看对话证据</Button>
      </article>)}
    </section>)}
    <form className="execution-review" onSubmit={event => {
      event.preventDefault(); if (busy) return; setBusy(true); setError('');
      const parsed = reviewSchema.safeParse({ decision, note });
      if (!parsed.success) { setError('请填写教师核对意见。'); setBusy(false); return; }
      void executionApi<TrialReport>(`/reports/${report.id}/review`, parsed.data).then(setReport)
        .catch(error => setError(failureMessage(error))).finally(() => setBusy(false));
    }}><h3>教师核对</h3>
      <label className="form-field">下一步<select value={decision} onChange={event => setDecision(event.target.value as keyof typeof decisions)}>
        {Object.entries(decisions).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label><label className="form-field">核对意见<textarea required rows={3} maxLength={2000} value={note} onChange={event => setNote(event.target.value)} /></label>
      {error && <p role="alert">{error}</p>}
      <div className="inline-actions"><Button disabled={busy} type="submit">保存核对意见</Button>
        <Button type="button" variant="outline" onClick={onEdit}>调整学习场景</Button>
        <Button type="button" variant="outline" onClick={onMethods}>查看与修改教学方法</Button></div>
      {report.review && <p role="status">已记录：{decisions[report.review.decision]}</p>}
    </form>
    <Dialog open={!!evidence} onOpenChange={open => { if (!open) setEvidence(null); }}><DialogContent className="execution-evidence-dialog">
      <DialogHeader><DialogTitle>对话证据</DialogTitle><DialogDescription>{evidence?.session.name}的实际交互记录；标出的消息用于报告结论。</DialogDescription></DialogHeader>
      {evidence && <Transcript messages={evidence.session.messages} highlight={evidence.ids} />}
    </DialogContent></Dialog>
  </section>;
}
