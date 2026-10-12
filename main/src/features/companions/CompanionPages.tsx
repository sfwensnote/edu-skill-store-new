import { useRef, useState } from 'react';
import { ArrowLeft, BookOpen, FileText, Link, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/Workbench';
import type { LearningCompanion } from '../../../shared/learning-companion';
import type { SkillEntry } from '../../../shared/marketplace';
import { downloadMaterial } from './MaterialFiles';
import { TaskSummary } from './TaskElements';
import { CompanionCard } from './CompanionCard';
import { CompanionAvatar } from './CompanionProfile';
import { CompanionRequirements, MethodRequirements } from './CompanionRequirements';
import './companions.css';
import './companion-library.css';
import './companion-overview.css';
import { CompanionTrialPanel } from '../execution/CompanionTrialPanel';

export function CompanionsPage({ items, skills, onCreate, onOpen, onEdit, onCopy, onRemove }: {
  items: LearningCompanion[]; skills: SkillEntry[]; onCreate: () => void; onOpen: (value: LearningCompanion) => void;
  onEdit: (value: LearningCompanion) => void; onCopy: (id: string) => boolean; onRemove: (id: string) => boolean | Promise<boolean>;
}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [subject, setSubject] = useState('all');
  const [sort, setSort] = useState('updated');
  const [pending, setPending] = useState<LearningCompanion | null>(null);
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState(false);
  const [message, setMessage] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const originRef = useRef<HTMLButtonElement | null>(null);
  const subjects = [...new Set(items.map(item => item.subject).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
  const search = query.trim().toLocaleLowerCase();
  const filtered = items.filter(item => (status === 'all' || item.status === status) && (subject === 'all' || item.subject === subject) &&
    [item.name, item.introduction, ...Object.values(item.task), ...item.materials.map(material => material.name),
      ...item.skillIds.map(id => skills.find(entry => entry.id === id)?.skill.name || '')].join(' ').toLocaleLowerCase().includes(search))
    .sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name, 'zh-CN') : (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0));
  function clearFilters() { setQuery(''); setStatus('all'); setSubject('all'); setSort('updated'); }
  return <main className="page-frame market-page companion-page companion-library">
    <header className="companion-library-heading page-heading">
      <div><h1 ref={headingRef} tabIndex={-1}>我的学伴</h1><p>管理学伴、教学方法与学习材料。</p></div>
      <img src={`${import.meta.env.BASE_URL}companion-hero.png`} alt="" aria-hidden="true" />
      <Button className="page-heading-actions" onClick={onCreate}><Plus data-icon="inline-start" />创建学伴</Button>
    </header>
    <div className="market-panel companion-library-filters" role="search" aria-label="学伴搜索与筛选">
      <label className="companion-library-search"><Search aria-hidden="true" /><input type="search" aria-label="搜索学伴" placeholder="搜索学伴名称、简介或材料…" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <select aria-label="学伴状态" value={status} onChange={event => setStatus(event.target.value)}><option value="all">全部状态</option><option value="ready">已创建</option><option value="draft">草稿</option></select>
      <select aria-label="学伴学科" value={subject} onChange={event => setSubject(event.target.value)}><option value="all">全部学科</option>{subjects.map(item => <option key={item}>{item}</option>)}</select>
      <select aria-label="学伴排序" value={sort} onChange={event => setSort(event.target.value)}><option value="updated">最近更新</option><option value="name">名称排序</option></select>
    </div>
    {message && <p className="companion-library-message" role="status">{message}</p>}
    {!items.length ? <EmptyState title="还没有学伴">创建学伴后，会显示在这里。</EmptyState> : !filtered.length ?
      <EmptyState title="没有找到符合条件的学伴" action={<Button variant="outline" onClick={clearFilters}>清除筛选</Button>} /> :
      <div className="companion-list">{filtered.map(item => <CompanionCard key={item.id} value={item} skills={skills}
        onOpen={() => onOpen(item)} onEdit={() => onEdit(item)} onCopy={() => {
          setMessage(''); if (onCopy(item.id)) { clearFilters(); setMessage('已复制为草稿'); }
        }} onRemove={trigger => { originRef.current = trigger; setError(''); setPending(item); }} />)}</div>}
    <Dialog open={!!pending} onOpenChange={open => { if (!open && !removing) { setPending(null); setError(''); } }}>
      <DialogContent onCloseAutoFocus={event => { event.preventDefault(); (originRef.current?.isConnected ? originRef.current : headingRef.current)?.focus(); }}>
        <DialogHeader><DialogTitle>删除这个学伴？</DialogTitle><DialogDescription>“{pending?.name || '未命名学伴'}”及其学习任务、材料将从我的学伴中删除。挂载的 SKILL 仍保留。</DialogDescription></DialogHeader>
        {error && <p role="alert">{error}</p>}
        <div className="inline-actions"><Button variant="outline" disabled={removing} onClick={() => setPending(null)}>取消</Button><Button variant="destructive" disabled={removing} onClick={() => {
          if (!pending || removing) return; setRemoving(true);
          void Promise.resolve().then(() => onRemove(pending.id)).then(success => {
            if (!success) { setError('删除未保存，学伴仍保留。请释放存储空间后重试。'); return; }
            setPending(null); setError(''); clearFilters(); setMessage('已删除学伴');
          }).catch(error => setError(error instanceof Error ? error.message : '删除未完成，请重试。')).finally(() => setRemoving(false));
        }}>{removing ? '正在检查…' : '确认删除'}</Button></div>
      </DialogContent>
    </Dialog>
  </main>;
}
export function CompanionDetail({ value, skills, onBack, onEdit, onCheck, onMethods }: {
  value: LearningCompanion; skills: SkillEntry[]; onBack: () => void; onEdit: () => void;
  onCheck: (entry: SkillEntry) => void; onMethods: () => void;
}) {
  const selected = value.skillIds.map(id => skills.find(entry => entry.id === id));
  return <main className="page-frame market-page companion-page companion-overview">
    <header className="companion-overview-heading page-heading">
      <button className="back-link" onClick={onBack}><ArrowLeft />返回我的学伴</button>
      <div className="companion-overview-image"><CompanionAvatar value={value} /></div>
      <div className="companion-overview-profile"><div className="companion-card-title"><h1>{value.name || '未命名学伴'}</h1><span className="companion-card-status" data-status={value.status}>{value.status === 'draft' ? '草稿' : '已创建'}</span></div>
        {value.introduction && <p>{value.introduction}</p>}
        <p className="companion-overview-meta">{[value.grade, value.subject, value.year].filter(Boolean).join(' · ')}</p>
      </div>
      <Button className="page-heading-actions" variant="outline" onClick={onEdit}>编辑学伴</Button>
    </header>
    {selected.some(entry => !entry) && <p role="alert">关联的 SKILL 已移除，请编辑学伴重新选择。教学任务与材料仍保留。</p>}
    <div className="companion-activity">
      <div className="companion-overview-main">
        <section className="market-panel companion-overview-panel"><h2><BookOpen aria-hidden="true" />学习场景</h2><TaskSummary task={value.task} />
          {!Object.values(value.task).some(Boolean) && <p className="subtle">尚未设置学习场景</p>}
        </section>
        {value.design.contextual && <section className="market-panel companion-overview-panel"><h2>情景题</h2><h3>教学情景</h3><p>{value.design.context}</p><h3>题目</h3><p>{value.design.question}</p></section>}
        {value.design.pbl && <section className="market-panel companion-overview-panel"><h2>PBL 学习活动</h2><h3>驱动问题</h3><p>{value.design.drivingQuestion}</p><h3>项目成果</h3><p>{value.design.product}</p><h3>活动阶段</h3><p>{value.design.stages}</p></section>}
        <CompanionRequirements value={value} skills={skills} />
      </div>
      <aside className="companion-overview-side" aria-label="学伴的 SKILL 与材料">
        <section className="market-panel companion-overview-panel"><h2><Link aria-hidden="true" />挂载的 SKILL <small>{selected.filter(Boolean).length} 个</small></h2>
          {selected.filter((entry): entry is SkillEntry => !!entry).map(entry => <details className="companion-overview-skill" key={entry.id}><summary>{entry.skill.name}</summary><p>{entry.skill.summary}</p><MethodRequirements entry={entry} /></details>)}
          {!selected.some(Boolean) && <p className="subtle">尚未挂载可用 SKILL</p>}
        </section>
        <section className="market-panel companion-overview-panel"><h2><FileText aria-hidden="true" />教学材料 <small>{value.materials.length} 份</small></h2>{value.materials.length ? <ul className="companion-files">{value.materials.map(item => <li key={item.id}><span>{item.name}</span><Button variant="link" onClick={() => downloadMaterial(item)}>下载材料</Button></li>)}</ul> : <p className="subtle">未添加材料</p>}</section>
      </aside>
    </div>
    <CompanionTrialPanel value={value} skills={skills} onEdit={onEdit} onCheck={onCheck} onMethods={onMethods} />
  </main>;
}
