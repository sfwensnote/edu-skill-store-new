import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, FileText, Save, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/Workbench';
import { SaveFailureExitGuard } from '@/components/SaveFailureExitGuard';
import type { SkillEntry } from '../../../shared/marketplace';
import { companionIssue, companionSteps, newCompanion, type CompanionStep, type LearningCompanion } from '../../../shared/learning-companion';
import { applyCompanionCase, companionCases, getCompanionCase, isCompanionCaseMethod, withCompanionCaseSkills } from '../../../shared/companion-cases';
import { TaskElements } from './TaskElements';
import { MaterialFiles } from './MaterialFiles';
import { CompanionProfile } from './CompanionProfile';
import { CompanionConfirmation, CompanionPreview } from './CompanionPreview';
import { useVerification } from '../execution/useVerification';
import { methodInput, serviceConfigured } from '../execution/api';

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
  const [caseChoice, setCaseChoice] = useState(companionCases[0]?.id || '');
  const [pendingCase, setPendingCase] = useState<string | null>(null);
  const caseSkill = (target: LearningCompanion, entry: SkillEntry) => {
    try { return isCompanionCaseMethod(target, methodInput(entry)); } catch { return false; }
  };
  const caseExempt = (target: LearningCompanion, entry: SkillEntry) => !serviceConfigured && caseSkill(target, entry);
  const issueFor = (target: LearningCompanion, through: CompanionStep = 4) =>
    companionIssue(target, withCompanionCaseSkills(target, skills), through);
  const unverified = (target: LearningCompanion) => target.skillIds.some(id => {
    const entry = withCompanionCaseSkills(target, skills).find(candidate => candidate.id === id);
    return !entry || (!verification.verified(entry) && !caseExempt(target, entry));
  });
  // 与新建默认值比较，区分教师实际改动和初始默认值；只改头像或年级时案例也要先确认覆盖。
  const blank = newCompanion(value.id);
  const hasContent = (target: LearningCompanion) => Boolean(target.name.trim() || target.introduction.trim() || target.year.trim() ||
    target.avatarImage.trim() || target.avatar !== blank.avatar || target.grade !== blank.grade || target.subject !== blank.subject ||
    Object.values(target.task).some(entry => entry.trim()) || target.skillIds.length || target.materials.length ||
    Object.values(target.design).some(entry => typeof entry === 'string' ? entry.trim() : entry));
  const caseEntries = withCompanionCaseSkills(value, []);
  const activeSkills = withCompanionCaseSkills(value, skills);
  function applyCase(id: string) {
    const next = applyCompanionCase(valueRef.current, id);
    if (!persist(next)) return;
    valueRef.current = next; setValue(next);
    window.scrollTo({ top: 0, behavior: 'instant' });
    requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
  }
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
      const issue = issueFor(valueRef.current, (step - 1) as CompanionStep);
      if (issue) { setError(issue); return; }
      if (step > 2 && unverified(valueRef.current)) {
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
    const issue = issueFor(valueRef.current);
    if (issue) { setError(issue); return; }
    if (unverified(valueRef.current)) {
      setError('所选方法尚未验证，请先完成 SKILL 检测。'); return;
    }
    const next = { ...valueRef.current, status: 'ready' as const };
    if (persist(next)) onDone();
  }
  function leave(action: () => void) { if (!reading && persist(valueRef.current)) action(); }
  const missing = value.skillIds.filter(id => !withCompanionCaseSkills(value, skills).some(entry => entry.id === id));
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
          disabled={reading || (item.step > value.step + 1 && !!issueFor(value, (item.step - 1) as CompanionStep))}
          onClick={() => moveTo(item.step)}><Icon /><span>{item.label}</span></button>;
      })}</nav>
      {value.step === 4 && <CompanionPreview value={value} skills={activeSkills} />}
      <section className="market-panel companion-editor" aria-labelledby="companion-step-title">
        <header className="companion-step-heading"><h2 id="companion-step-title" ref={headingRef} tabIndex={-1}>{currentStep.label}</h2><p>{stepHints[value.step - 1]}</p></header>
        {value.step === 1 && <>
          {!serviceConfigured && <section className="companion-case-picker" aria-label="案例填入">
            <div><h3>从案例开始</h3><p>选择一个案例，自动填入学伴信息、学习场景和配套方法，可直接体验后再修改。</p></div>
            <label className="form-field">案例<select value={caseChoice} disabled={reading} onChange={event => setCaseChoice(event.target.value)}>
              {companionCases.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select></label>
            <p className="subtle">{companionCases.find(item => item.id === caseChoice)?.description}</p>
            <Button variant="outline" disabled={reading || !caseChoice} onClick={() => {
              if (hasContent(valueRef.current)) setPendingCase(caseChoice); else applyCase(caseChoice);
            }}>填入案例</Button>
          </section>}
          {serviceConfigured && getCompanionCase(value.caseId) && <p className="status-message">此学伴包含案例方法，请选择已核对的教学方法。</p>}
          <CompanionProfile value={value} onChange={change} onBusy={setReading} />
        </>}
        {value.step === 2 && <>
          {verification.error && <p role="alert">{verification.error}</p>}
          {!!caseEntries.length && <div className="companion-skill-list companion-case-skill">
            {caseEntries.map(entry => <label key={entry.id} className="companion-skill-option" data-case="true">
              <input type="checkbox" checked={value.skillIds.includes(entry.id)} onChange={event => change({ skillIds: event.target.checked ? [...new Set([...value.skillIds, entry.id])] : value.skillIds.filter(id => id !== entry.id) })} />
              <span><strong>{entry.skill.name}</strong><small>案例配套方法 · 仅用于试运行</small><span>{entry.skill.summary}</span></span>
            </label>)}
          </div>}
          <div className="companion-skill-list">{skills.filter(entry => !caseSkill(value, entry)).map(entry => <label key={entry.id} className="companion-skill-option">
            <input type="checkbox" disabled={!verification.verified(entry) && !value.skillIds.includes(entry.id)} checked={value.skillIds.includes(entry.id)} onChange={event => change({ skillIds: event.target.checked ? [...value.skillIds, entry.id] : value.skillIds.filter(id => id !== entry.id) })} />
            <span><strong>{entry.skill.name}</strong><small>{entry.grade} · {entry.subject} · {verification.verified(entry) ? serviceConfigured ? '已验证' : '教师已核对' : '待检测'}</small><span>{entry.skill.summary}</span></span>
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
        {value.step === 4 && <CompanionConfirmation value={value} skills={activeSkills} />}
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
    <Dialog open={!!pendingCase} onOpenChange={open => { if (!open) setPendingCase(null); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>用案例覆盖当前填写？</DialogTitle><DialogDescription>当前表单内容会替换成案例内容。已保存的其他学伴不会受到影响。</DialogDescription></DialogHeader>
        <div className="inline-actions"><Button variant="outline" onClick={() => setPendingCase(null)}>取消</Button>
          <Button onClick={() => { const id = pendingCase; setPendingCase(null); if (id) applyCase(id); }}>确认覆盖并填入</Button></div>
      </DialogContent>
    </Dialog>
    <SaveFailureExitGuard failed={unsaved} onRetry={() => persist(valueRef.current)} />
  </main>;
}
