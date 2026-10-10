import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/Workbench';
import { companionContext, taskFields, type LearningCompanion } from '../../../shared/learning-companion';
import type { SkillEntry } from '../../../shared/marketplace';
import { downloadMaterial } from './MaterialFiles';
import './companions.css';

export function CompanionsPage({ items, skills, onCreate, onOpen }: {
  items: LearningCompanion[]; skills: SkillEntry[]; onCreate: () => void; onOpen: (value: LearningCompanion) => void;
}) {
  return <main className="page-frame market-page companion-page"><header className="detail-heading"><h1>我的学伴</h1><Button onClick={onCreate}><Plus />创建学伴</Button></header>
    {!items.length ? <EmptyState title="还没有学伴" action={<Button variant="outline" onClick={onCreate}>创建学伴</Button>}>从我的 SKILL 选择教学方法，设置学习任务。</EmptyState> :
      <div className="companion-list">{items.map(item => <article className="market-panel companion-card" key={item.id}>
        <div><small className="subtle">{item.status === 'draft' ? '草稿' : '教学活动已创建'}</small><h2>{item.name || '未命名学伴'}</h2>
          <p>{item.skillIds.map(id => skills.find(entry => entry.id === id)?.skill.name || 'SKILL 已移除').join('、') || '尚未选择 SKILL'}</p>
          {item.task.title && <p className="subtle">{item.task.title}</p>}</div>
        <Button variant="outline" onClick={() => onOpen(item)}>{item.status === 'draft' ? '继续创建' : '查看教学活动'}</Button>
      </article>)}</div>}
  </main>;
}
export function CompanionDetail({ value, skills, onBack, onEdit }: { value: LearningCompanion; skills: SkillEntry[]; onBack: () => void; onEdit: () => void }) {
  const selected = value.skillIds.map(id => skills.find(entry => entry.id === id));
  return <main className="page-frame market-page companion-page">
    <button className="back-link" onClick={onBack}><ArrowLeft />返回我的学伴</button>
    <header className="detail-heading"><div><h1>{value.name}</h1><p>基础模型 + {selected.filter(Boolean).map(entry => entry!.skill.name).join('、')}</p></div><Button variant="outline" onClick={onEdit}>编辑学伴</Button></header>
    {selected.some(entry => !entry) && <p role="alert">关联的 SKILL 已移除，请编辑学伴重新选择。教学任务与材料仍保留。</p>}
    <article className="market-panel companion-activity"><h2>{value.task.title}</h2>
      <dl className="companion-task-summary">{taskFields.slice(1).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{value.task[key]}</dd></div>)}</dl>
      {value.design.contextual && <section><h2>情景题</h2><p>{value.design.context}</p><p>{value.design.question}</p></section>}
      {value.design.pbl && <section><h2>PBL 学习活动</h2><h3>驱动问题</h3><p>{value.design.drivingQuestion}</p><h3>项目成果</h3><p>{value.design.product}</p><h3>活动阶段</h3><p>{value.design.stages}</p></section>}
      <section><h2>教学材料</h2>{value.materials.length ? <ul className="companion-files">{value.materials.map(item => <li key={item.id}><span>{item.name}</span><Button variant="link" onClick={() => downloadMaterial(item)}>下载材料</Button></li>)}</ul> : <p className="subtle">未添加材料</p>}</section>
      <section><h2>挂载的 SKILL</h2>{selected.filter((entry): entry is SkillEntry => !!entry).map(entry => <details key={entry.id}><summary>{entry.skill.name}</summary><p>{entry.skill.summary}</p><p>{entry.skill.trigger}</p>{entry.skill.steps?.map((step, index) => <p key={index}>{step.condition}：{step.action}</p>)}</details>)}</section>
      <details><summary>学伴教学要求</summary><p>{companionContext(value, skills)}</p></details>
    </article>
  </main>;
}
