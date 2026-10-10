import { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/Workbench';
import type { SkillEntry } from '../../../shared/marketplace';
import { companionIssue, type LearningCompanion } from '../../../shared/learning-companion';
import { TaskElements } from './TaskElements';
import { MaterialFiles } from './MaterialFiles';

export function CompanionEditor({ initial, skills, onSave, onDone, onBack, onSkills }: {
  initial: LearningCompanion; skills: SkillEntry[]; onSave: (value: LearningCompanion) => boolean;
  onDone: () => void; onBack: () => void; onSkills: () => void;
}) {
  const [value, setValue] = useState(initial);
  const [editing] = useState(initial.status === 'ready');
  const valueRef = useRef(value);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [unsaved, setUnsaved] = useState(false);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (unsaved) event.preventDefault(); };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [unsaved]);
  function change(next: Partial<LearningCompanion>) {
    const draft = { ...valueRef.current, ...next, status: 'draft' as const };
    valueRef.current = draft;
    setValue(draft); setSaved(false); setError('');
    // 学伴草稿按账号保存；保存失败时仍保留输入，下一步不得假报成功。
    setUnsaved(!onSave(draft));
  }
  function persist(next: LearningCompanion) {
    if (!onSave(next)) { setUnsaved(true); setError('保存失败，请减少附件或释放存储空间后重试。'); return false; }
    setUnsaved(false); setSaved(true); setError(''); return true;
  }
  function next() {
    const issue = companionIssue(value, skills, value.step === 2);
    if (issue) { setError(issue); return; }
    const updated = { ...value, step: 2 as const, status: value.step === 2 ? 'ready' as const : 'draft' as const };
    if (!persist(updated)) return;
    valueRef.current = updated; setValue(updated);
    if (updated.status === 'ready') onDone();
    else window.scrollTo({ top: 0, behavior: 'instant' });
  }
  const missing = value.skillIds.filter(id => !skills.some(entry => entry.id === id));
  return <main className="page-frame companion-page">
    <button className="back-link" disabled={reading} onClick={() => { if (persist(value)) onBack(); }}><ArrowLeft />返回我的学伴</button>
    <header className="detail-heading"><h1>{editing ? '编辑学伴' : '创建学伴'}</h1><span className="subtle">{value.step} / 2</span></header>
    <div className="companion-steps" aria-label="创建进度"><span aria-current={value.step === 1 ? 'step' : undefined}>选择 SKILL 与命名</span><span aria-current={value.step === 2 ? 'step' : undefined}>设定学习任务</span></div>
    <div className="market-panel companion-editor">
      {value.step === 1 ? <>
        <label className="form-field">学伴名称<input required maxLength={80} value={value.name} onChange={event => change({ ...value, name: event.target.value })} /></label>
        <section><h2>选择我的 SKILL</h2><p className="subtle">共用基础模型，按所选教学方法引导学生。</p>
          <div className="companion-skill-list">{skills.map(entry => <label key={entry.id} className="companion-skill-option">
            <input type="checkbox" checked={value.skillIds.includes(entry.id)} onChange={event => change({ ...value, skillIds: event.target.checked ? [...value.skillIds, entry.id] : value.skillIds.filter(id => id !== entry.id) })} />
            <span><strong>{entry.skill.name}</strong><small>{entry.grade} · {entry.subject} · {entry.addedFrom ? '从集市添加' : '我创建的'}</small><span>{entry.skill.summary}</span></span>
          </label>)}</div>
          {!!missing.length && <p role="alert">有 {missing.length} 项 SKILL 已移除。<Button variant="link" onClick={() => change({ ...value, skillIds: value.skillIds.filter(id => !missing.includes(id)) })}>清除失效选择</Button></p>}
          {!skills.length && <EmptyState title="还没有可选择的 SKILL" action={<Button variant="outline" onClick={onSkills}>前往我的 SKILL</Button>} />}
        </section>
      </> : <>
        <div className="companion-selection"><strong>{value.name}</strong><span>{value.skillIds.map(id => skills.find(entry => entry.id === id)?.skill.name || 'SKILL 已移除').join('、')}</span></div>
        <TaskElements task={value.task} design={value.design} onTask={task => change({ ...value, task })} onDesign={design => change({ ...value, design })} />
        <MaterialFiles onBusy={setReading} materials={value.materials} onChange={materials => change({ materials })} />
      </>}
      {error && <p role="alert">{error}</p>}
      <footer className="companion-actions">
        <span role="status">{saved ? '已保存' : unsaved ? '有内容未保存' : ''}</span>
        {value.step === 2 && <Button disabled={reading} variant="outline" onClick={() => change({ ...value, step: 1 })}>上一步</Button>}
        <Button disabled={reading} variant="outline" onClick={() => persist(value)}>保存草稿</Button>
        <Button disabled={reading} onClick={next}>{value.step === 1 ? '下一步' : editing ? '保存教学活动' : '创建教学活动'}</Button>
      </footer>
    </div>
  </main>;
}
