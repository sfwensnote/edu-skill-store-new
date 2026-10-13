import { useEffect, useState } from 'react';
import type { LearningCompanion } from '../../../shared/learning-companion';
import type { Trial } from '../../../shared/execution';
import { executionApi, failureMessage, serviceConfigured } from './api';
import { buildRunMetrics, type CompanionRunDetail } from './companion-run-metrics';
import { CompanionRunReportView, reportDuration, reportTime } from './CompanionRunReportView';

export function CompanionRunReportPage({ value, trialId, onSelectRun, onBack, onRun, onPractice }: {
  value: LearningCompanion; trialId?: string; onSelectRun: (id: string) => void;
  onBack: () => void; onRun: () => void; onPractice: () => void;
}) {
  const [trials, setTrials] = useState<Trial[]>([]);
  const [detail, setDetail] = useState<CompanionRunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let disposed = false;
    setLoading(true); setError(''); setDetail(null);
    void (async () => {
      if (serviceConfigured) throw new Error('当前服务模式请使用原有受控试用报告。');
      const list = (await executionApi<Trial[]>(`/trials?companionId=${encodeURIComponent(value.id)}&purpose=run`)).filter(trial => trial.companion.id === value.id);
      if (disposed) return;
      setTrials(list);
      const chosen = trialId ? list.find(trial => trial.id === trialId) : list[0];
      if (trialId && !chosen) throw new Error('这条运行记录不存在或不属于当前学伴，请选择其他记录。');
      if (chosen) {
        const next = await executionApi<CompanionRunDetail>(`/trials/${encodeURIComponent(chosen.id)}`);
        if (next.trial.id !== chosen.id || next.trial.companion.id !== value.id) throw new Error('运行记录归属不匹配，未展示其他学伴资料。');
        if (!disposed) setDetail(next);
      }
    })().catch(reason => { if (!disposed) setError(failureMessage(reason)); }).finally(() => { if (!disposed) setLoading(false); });
    return () => { disposed = true; };
  }, [value.id, trialId, revision]);
  const metrics = buildRunMetrics(detail ? [detail] : []);
  function download() {
    if (!detail) return;
    const text = [`# ${value.name}运行报告`, `运行时间：${reportTime(detail.trial.createdAt)} — ${reportTime(detail.trial.expiresAt)}`, `教学方法触发数：${metrics.activationCount}`, `已记录对话：${metrics.conversationCount}`, '结束状态不代表学习任务完成。', ...metrics.rows.flatMap(row => [`\n## ${row.name}（${row.audience === 'teacher' ? '教师对话' : '学生对话'}）`, `对话时长：${reportDuration(row.durationSeconds)}`, ...row.messages.map(message => `\n${message.role === 'user' ? '学生表达' : '学伴回复'} · ${reportTime(message.at)}\n${message.content}`)])].join('\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `${value.name.replace(/[\\/:*?"<>|]/g, '-') || '学伴'}运行报告.txt`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <CompanionRunReportView key={`${value.id}:${detail?.trial.id || trialId || ''}`} value={value} trials={trials} selectedTrialId={detail?.trial.id || trialId || ''} metrics={metrics} loading={loading} error={error}
    onRetry={() => setRevision(value => value + 1)} onSelectRun={onSelectRun} onBack={onBack} onRun={onRun} onPractice={onPractice} onDownload={download}
    onStop={async () => { if (!detail) return; await executionApi(`/trials/${encodeURIComponent(detail.trial.id)}/stop`, { status: 'closed' }); setRevision(value => value + 1); }} />;
}
