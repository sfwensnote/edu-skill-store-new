import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, FileText, Save, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/Workbench';
import { SaveFailureExitGuard } from '@/components/SaveFailureExitGuard';
import type { SkillEntry } from '../../../shared/marketplace';
import { companionIssue, companionSteps, type CompanionStep, type LearningCompanion } from '../../../shared/learning-companion';
import { TaskElements } from './TaskElements';
import { MaterialFiles } from './MaterialFiles';
import { CompanionProfile } from './CompanionProfile';
import { CompanionConfirmation, CompanionPreview } from './CompanionPreview';
import { useVerification } from '../execution/useVerification';

const stepIcons = [UserRound, FileText, BookOpen, Save];
const stepHints = ['设置学伴的名称、简介和适用范围。', '从我的 SKILL 中选择教学方法。', '选择学习对象与情境，写明任务和目标。', '确认学伴信息、教学方法与学习任务。'];

export function CompanionEditor({ initial, skills, onSave, onDone, onBack, onSkills }: {
  initial: LearningCompanion; skills: SkillEntry[]; onSave: (value: LearningCompanion) => boolean;
  onDone: () => void; onBack: () => void; onSkills: () => void;
}) {
  const verification = useVerification();
  const [value, setValue] = useState(() => initial.status === 'ready' ? { ...initial, step: 1 as const } : initial);
  const [editing] = useState(initial.status === 'ready');
  const valueRef = useRef(value);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [unsaved, setUnsaved] = useState(false);
  function change(patch: Partial<LearningCompanion>) {
    const draft = { ...valueRef.current, ...patch, status: 'draft' as const };
    valueRef.current = draft;
    setValue(draft); setSaved(false); setError('');
    setUnsaved(!onSave(draft));
  }
  function persist(next: LearningCompanion) {
    if (!onSave(next)) { setUnsaved(true); setError('保存失败，请减少附件或释放存储空间后重试。'); return false; }
    setUnsaved(false); setSaved(true); setError(''); return true;
  }
  function moveTo(step: CompanionStep) {
    if (reading || step === value.step) return;
    if (step > value.step) {
      const issue = companionIssue(valueRef.current, skills, (step - 1) as CompanionStep);
      if (issue) { setError(issue); return; }
      if (step > 2 && valueRef.current.skillIds.some(id => !skills.some(entry => entry.id === id && verification.verified(entry)))) {
        setError('请先检测所选 SKILL 并确认结果，再挂载到学伴。'); return;
      }
    }
    const next = { ...valueRef.current, step };
    if (!persist(next)) return;
    valueRef.current = next; setValue(next);
    window.scrollTo({ top: 0, behavior: 'instant' });
    requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
  }
  function finish() {
    const issue = companionIssue(valueRef.current, skills);
    if (issue) { setError(issue); return; }
    if (valueRef.current.skillIds.some(id => !skills.some(entry => entry.id === id && verification.verified(entry)))) {
      setError('所选方法尚未验证，请先完成 SKILL 检测。'); return;
    }
    const next = { ...valueRef.current, status: 'ready' as const };
    if (persist(next)) onDone();
  }
  function leave(action: () => void) { if (!reading && persist(valueRef.current)) action(); }
  const missing = value.skillIds.filter(id => !skills.some(entry => entry.id === id));
  const currentStep = companionSteps[value.step - 1];
  return <main className="page-frame companion-page companion-creation">
    <header className="companion-creation-heading page-heading">
      <button className="back-link" disabled={reading} onClick={() => leave(onBack)}><ArrowLeft />返回我的学伴</button>
      <div><h1>{editing ? '编辑我的学伴' : '创建我的学伴'}</h1><p>选择教学方法，设置学生的学习任务。</p></div>
      <img className="companion-hero-art" src={`${import.meta.env.BASE_URL}companion-hero.png`} alt="" aria-hidden="true" />
    </header>
    <ol className="companion-stepper" aria-label="创建进度">{companionSteps.map(item => <li key={item.step} aria-current={value.step === item.step ? 'step' : undefined} data-completed={item.step < value.step}>
      <span className="companion-step-number">{item.step < value.step ? <Check /> : item.step}</span>
      <div><strong>{item.label}</strong><small>{item.caption}</small></div>
    </li>)}</ol>
    <div className="companion-creation-layout">
      <nav className="companion-step-nav market-panel" aria-label="学伴创建步骤">{companionSteps.map((item, index) => {
        const Icon = stepIcons[index];
        return <button key={item.step} aria-current={value.step === item.step ? 'step' : undefined}
          disabled={reading || (item.step > value.step + 1 && !!companionIssue(value, skills, (item.step - 1) as CompanionStep))}
          onClick={() => moveTo(item.step)}><Icon /><span>{item.label}</span></button>;
      })}</nav>
      {value.step === 4 && <CompanionPreview value={value} skills={skills} />}
      <section className="market-panel companion-editor" aria-labelledby="companion-step-title">
        <header className="companion-step-heading"><h2 id="companion-step-title" ref={headingRef} tabIndex={-1}>{currentStep.label}</h2><p>{stepHints[value.step - 1]}</p></header>
        {value.step === 1 && <CompanionProfile value={value} onChange={change} onBusy={setReading} />}
        {value.step === 2 && <>
          {verification.error && <p role="alert">{verification.error}</p>}
          <div className="companion-skill-list">{skills.map(entry => <label key={entry.id} className="companion-skill-option">
            <input type="checkbox" disabled={!verification.verified(entry) && !value.skillIds.includes(entry.id)} checked={value.skillIds.includes(entry.id)} onChange={event => change({ skillIds: event.target.checked ? [...value.skillIds, entry.id] : value.skillIds.filter(id => id !== entry.id) })} />
            <span><strong>{entry.skill.name}</strong><small>{entry.grade} · {entry.subject} · {verification.verified(entry) ? '已验证' : '待检测'}</small><span>{entry.skill.summary}</span></span>
          </label>)}</div>
          {!!missing.length && <p role="alert">有 {missing.length} 项 SKILL 已移除。<Button variant="link" onClick={() => change({ skillIds: value.skillIds.filter(id => !missing.includes(id)) })}>清除失效选择</Button></p>}
          {!skills.length && <EmptyState title="还没有可选择的 SKILL" action={<Button variant="outline" onClick={() => leave(onSkills)}>前往我的 SKILL</Button>} />}
        </>}
        {value.step === 3 && <>
          <TaskElements task={value.task} design={value.design} onTask={task => change({ task })} onDesign={design => change({ design })} />
          <details className="companion-extra"><summary>教学材料（选填）{value.materials.length ? ` · ${value.materials.length} 份` : ''}</summary>
            <MaterialFiles onBusy={setReading} materials={value.materials} onChange={materials => change({ materials })} />
          </details>
        </>}
        {value.step === 4 && <CompanionConfirmation value={value} skills={skills} />}
        {error && <p role="alert">{error}</p>}
        <footer className="companion-actions">
          <span role="status">{saved ? '已保存' : unsaved ? '有内容未保存' : ''}</span>
          {value.step === 1 ? <Button disabled={reading} variant="outline" onClick={() => leave(onBack)}>取消</Button> :
            <Button disabled={reading} variant="outline" onClick={() => moveTo((value.step - 1) as CompanionStep)}><ArrowLeft data-icon="inline-start" />返回上一步</Button>}
          <Button disabled={reading} variant="outline" onClick={() => persist(valueRef.current)}>保存草稿</Button>
          <Button disabled={reading} onClick={value.step === 4 ? finish : () => moveTo((value.step + 1) as CompanionStep)}>
            {value.step === 4 ? editing ? '保存学伴' : '创建学伴' : `下一步：${companionSteps[value.step].label}`}
            <ArrowRight data-icon="inline-end" />
          </Button>
        </footer>
      </section>
    </div>
    <SaveFailureExitGuard failed={unsaved} onRetry={() => persist(valueRef.current)} />
  </main>;
}
