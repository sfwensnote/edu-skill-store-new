import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, Download, Play, MessageCircle, Zap, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { LearningCompanion } from '../../../shared/learning-companion';
import type { Trial } from '../../../shared/execution';
import type { CompanionRunMetrics, CompanionRunRow } from './companion-run-metrics';
import './companion-run-report.css';

const statusName = { running: '进行中', ended: '已结束', revoked: '已撤销', expired: '已到期' };
export const reportTime = (at: string) => Number.isFinite(Date.parse(at)) ? new Date(at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }) : '时间未记录';
export const reportDuration = (seconds: number | null) => seconds === null ? '暂无时长' : seconds < 60 ? `${seconds} 秒` : `${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒`;

export function CompanionRunReportView({ value, trials, selectedTrialId, metrics, loading, error, onRetry, onSelectRun, onBack, onRun, onPractice, onDownload, onStop }: {
  value: LearningCompanion; trials: Trial[]; selectedTrialId: string; metrics: CompanionRunMetrics;
  loading: boolean; error: string; onRetry: () => void; onSelectRun: (id: string) => void;
  onBack: () => void; onRun: () => void; onPractice: () => void; onDownload: () => void; onStop: () => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('recent');
  const [opened, setOpened] = useState<CompanionRunRow | null>(null);
  const [stopping, setStopping] = useState(false);
  const [stopBusy, setStopBusy] = useState(false);
  const [stopError, setStopError] = useState('');
  const origin = useRef<HTMLButtonElement | null>(null);
  const rows = useMemo(() => metrics.rows.filter(row => [row.name, row.audience === 'teacher' ? '教师对话' : '学生对话', ...row.messages.map(message => message.content)].join(' ').includes(query.trim()))
    .sort((a, b) => sort === 'triggers' ? b.activationCount - a.activationCount : sort === 'duration' ? (b.durationSeconds ?? -1) - (a.durationSeconds ?? -1) : Date.parse(b.createdAt) - Date.parse(a.createdAt)), [metrics.rows, query, sort]);
  const selected = trials.find(trial => trial.id === selectedTrialId);
  const maxUsage = Math.max(1, ...metrics.methodUsage.map(item => item.count));
  const maxMinutes = Math.max(1, ...metrics.durationTrend.map(item => item.minutes));
  const counts = Object.entries(statusName).map(([key, name]) => ({ key, name, count: metrics.rows.filter(row => row.status === key).length }));
  const ended = counts.filter(item => item.key !== 'running').reduce((sum, item) => sum + item.count, 0);
  return <main className="page-frame market-page companion-report-page">
    <header className="run-report-heading"><button className="back-link" onClick={onBack}><ArrowLeft />返回{value.name || '学伴'}</button>
      <div className="run-report-title"><div><h1>运行报告</h1><p>「{value.name}」的教学方法使用与对话记录</p>{selected && <p className="subtle">运行时间　{reportTime(selected.createdAt)} — {reportTime(selected.expiresAt)}</p>}</div>
        <div className="run-report-actions"><Button variant="outline" disabled={loading || !!error || !selected} onClick={onDownload}><Download />下载报告</Button><Button onClick={onRun}><Play />再次运行</Button></div>
      </div>
    </header>
    <div className="run-report-toolbar"><label>运行记录<select aria-label="运行记录" value={selectedTrialId} disabled={loading || !trials.length} onChange={event => { setOpened(null); setQuery(''); onSelectRun(event.target.value); }}>
      {!selected && <option value="">{loading ? '正在读取…' : '选择运行记录'}</option>}{trials.map(trial => <option key={trial.id} value={trial.id}>{reportTime(trial.createdAt)} · {trial.status === 'open' && Date.parse(trial.expiresAt) > Date.now() ? '进行中' : '已结束'}</option>)}
    </select></label><div className="run-report-actions">{selected?.status === 'open' && Date.parse(selected.expiresAt) > Date.now() && <Button variant="outline" className="run-stop-button" disabled={loading} onClick={() => { setStopError(''); setStopping(true); }}>结束运行</Button>}<Button variant="outline" onClick={onPractice}>开始试运行</Button></div></div>
    {error ? <section className="market-panel run-report-empty" role="alert"><h2>报告读取未完成</h2><p>{error}</p><Button onClick={onRetry}>重新读取</Button></section> : loading ? <section className="market-panel run-report-empty" role="status">正在读取运行报告…</section> : <>
      <div className="run-report-stats"><section className="market-panel run-stat"><span className="run-stat-icon"><Zap /></span><div><h2>教学方法触发数</h2><strong>{metrics.activationCount}</strong><p>根据对话中记录的方法触发统计</p></div><div className="run-stat-decoration" aria-hidden="true">{metrics.methodUsage.slice(0, 6).map((item, index) => <i key={`${item.entryId}:${index}`} style={{ height: `${12 + item.count / maxUsage * 70}%` }} />)}</div></section>
        <section className="market-panel run-stat"><span className="run-stat-icon"><MessageCircle /></span><div><h2>已记录对话</h2><strong>{metrics.conversationCount}</strong><p>教师对话 {metrics.rows.filter(row => row.audience === 'teacher').length} 场 · 回复 {metrics.assistantTurns} 次</p></div></section></div>
      <div className="run-report-charts"><section className="market-panel run-chart"><h2>教学方法使用频次</h2>{metrics.methodUsage.length ? <ul className="run-usage-bars">{metrics.methodUsage.map((item, index) => <li key={`${item.entryId}:${index}`}><span title={item.name}>{item.name}</span><div className="run-bar-track"><i style={{ width: `${item.count / maxUsage * 100}%` }} /></div><strong>{item.count}</strong></li>)}</ul> : <p className="subtle">暂无方法使用记录</p>}</section>
        <section className="market-panel run-chart"><h2>对话时长趋势 <small>分钟 / 日</small></h2>{metrics.durationTrend.length ? <><svg className="run-trend" viewBox="0 0 320 160" role="img" aria-label="按日对话时长"><path d="M20 10 V140 H310" fill="none" stroke="var(--line)" />{[40, 80, 120].map(y => <path key={y} d={`M20 ${y} H310`} stroke="var(--line)" fill="none" />)}<polyline fill="none" stroke="var(--primary)" strokeWidth="3" points={metrics.durationTrend.map((item, index) => `${metrics.durationTrend.length === 1 ? 165 : 25 + index / (metrics.durationTrend.length - 1) * 280},${135 - item.minutes / maxMinutes * 110}`).join(' ')} />{metrics.durationTrend.map((item, index) => <circle key={item.day} cx={metrics.durationTrend.length === 1 ? 165 : 25 + index / (metrics.durationTrend.length - 1) * 280} cy={135 - item.minutes / maxMinutes * 110} r="5" fill="var(--primary)"><title>{item.day}：{item.minutes} 分钟</title></circle>)}</svg><div className="run-trend-labels">{metrics.durationTrend.map(item => <span key={item.day}>{item.day.slice(5)}<small>{item.minutes} 分</small></span>)}</div></> : <p className="run-chart-empty">记录两条带时间的消息后显示时长趋势</p>}</section>
        <section className="market-panel run-chart"><h2>对话状态分布</h2><div className="run-status-chart"><div className="run-status-ring" style={{ background: metrics.conversationCount ? `conic-gradient(var(--primary) ${ended / metrics.conversationCount * 100}%, var(--accent) 0)` : 'var(--secondary)' }}><span><strong>{metrics.conversationCount}</strong><small>已记录对话</small></span></div><ul>{counts.map(item => <li key={item.key}><i data-status={item.key} />{item.name}<strong>{item.count}</strong></li>)}</ul></div><p className="subtle">结束状态不代表学习任务完成。</p></section></div>
      <section className="market-panel run-records"><div className="run-records-heading"><h2>对话记录</h2><span className="subtle">{rows.length} 场</span></div><div className="run-records-filters"><label><Search aria-hidden="true" /><input aria-label="搜索对话" type="search" placeholder="搜索名称或对话内容" value={query} onChange={event => setQuery(event.target.value)} /></label><select aria-label="记录排序" value={sort} onChange={event => setSort(event.target.value)}><option value="recent">最近对话</option><option value="triggers">触发数最多</option><option value="duration">对话时长最长</option></select></div>
        <div className="run-table-scroll"><table aria-label="对话记录"><thead><tr><th>对话</th><th>时间</th><th>回复</th><th>触发</th><th>时长</th><th>状态</th><th>操作</th></tr></thead><tbody>{rows.map(row => <tr key={row.sessionId}><td><strong>{row.name || '未命名对话'}</strong><small>{row.audience === 'teacher' ? '教师对话' : '学生对话'}</small></td><td>{reportTime(row.createdAt)}</td><td>{row.assistantTurns}</td><td>{row.activationCount}</td><td>{reportDuration(row.durationSeconds)}</td><td><span className="run-status-badge" data-status={row.status}>{statusName[row.status]}</span></td><td><Button variant="outline" onClick={event => { origin.current = event.currentTarget; setOpened(row); }}>查看对话</Button></td></tr>)}{!rows.length && <tr><td colSpan={7} className="run-table-empty">{query ? '没有找到符合条件的对话' : '还没有对话记录；试运行记录独立保存。'}</td></tr>}</tbody></table></div>
      </section>
    </>}
    <Dialog open={!!opened} onOpenChange={open => { if (!open) setOpened(null); }}><DialogContent className="run-conversation-dialog" onCloseAutoFocus={event => { event.preventDefault(); origin.current?.focus(); }}><DialogHeader><DialogTitle>对话记录</DialogTitle><DialogDescription>{opened?.name} · {opened?.audience === 'teacher' ? '教师对话' : '学生对话'}</DialogDescription></DialogHeader><ol className="run-raw-messages">{opened?.messages.map(message => <li key={message.id} data-role={message.role}><small>{message.role === 'user' ? '学生表达' : '学伴回复'} · {reportTime(message.at)}</small><p>{message.content}</p></li>)}</ol></DialogContent></Dialog>
    <Dialog open={stopping} onOpenChange={open => { if (!stopBusy) setStopping(open); }}><DialogContent showCloseButton={!stopBusy} onEscapeKeyDown={event => { if (stopBusy) event.preventDefault(); }} onPointerDownOutside={event => { if (stopBusy) event.preventDefault(); }}><DialogHeader><DialogTitle>结束本次运行？</DialogTitle><DialogDescription>运行记录和报告会保留，试运行不受影响。</DialogDescription></DialogHeader>{stopError && <p role="alert">{stopError}</p>}<div className="run-report-actions"><Button variant="outline" disabled={stopBusy} onClick={() => setStopping(false)}>取消</Button><Button variant="destructive" disabled={stopBusy} onClick={() => { setStopBusy(true); void onStop().then(() => setStopping(false)).catch(reason => setStopError(reason instanceof Error ? reason.message : '结束未保存，请重试。')).finally(() => setStopBusy(false)); }}>{stopBusy ? '正在结束…' : '确认结束'}</Button></div></DialogContent></Dialog>
  </main>;
}
