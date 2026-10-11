import { Paperclip, Send } from 'lucide-react';
import type { LearningCompanion } from '../../../shared/learning-companion';
import type { SkillEntry } from '../../../shared/marketplace';
import { CompanionAvatar } from './CompanionProfile';
import { TaskSummary } from './TaskElements';

export function CompanionPreview({ value, skills }: { value: LearningCompanion; skills: SkillEntry[] }) {
  const selected = skills.filter(entry => value.skillIds.includes(entry.id));
  return <aside className="companion-preview market-panel" aria-label="学伴预览">
    <h2>学伴预览</h2>
    <div className="companion-preview-window">
      <header className="companion-preview-heading"><CompanionAvatar value={value} />
        <div><h3>{value.name || '未命名学伴'}</h3><p>{[value.grade, value.subject, value.year].filter(Boolean).join(' · ')}</p></div>
      </header>
      <div className="companion-preview-body">
        <div className="companion-greeting"><CompanionAvatar value={value} />
          <p>你好，我是{value.name || '你的学伴'}。{value.introduction && <><br />{value.introduction}</>}</p>
        </div>
        {!!selected.length && <section className="companion-preview-skills"><h3>教学方法</h3>
          <div>{selected.map(entry => <span key={entry.id}>{entry.skill.name}</span>)}</div>
        </section>}
        {!!value.task.taskAndGoals && <section className="companion-preview-task"><h3>学习任务</h3>
          <p>{value.task.taskAndGoals}</p>
          <small>{[value.task.audience, value.task.scenario].filter(Boolean).join(' · ')}</small>
        </section>}
      </div>
      <div className="companion-preview-composer" aria-hidden="true"><Paperclip /><span>学生提问…</span><Send /></div>
    </div>
  </aside>;
}

export function CompanionConfirmation({ value, skills }: { value: LearningCompanion; skills: SkillEntry[] }) {
  return <div className="companion-confirmation">
    <div className="companion-confirmation-profile"><CompanionAvatar value={value} /><div><h3>{value.name}</h3><p>{value.introduction}</p></div></div>
    <p className="subtle">{[value.grade, value.subject, value.year].filter(Boolean).join(' · ')}</p>
    <section><h3>挂载的 SKILL</h3><ul>{value.skillIds.map(id => <li key={id}>{skills.find(entry => entry.id === id)?.skill.name || 'SKILL 已移除'}</li>)}</ul></section>
    <TaskSummary task={value.task} />
    {!!value.materials.length && <section><h3>教学材料</h3><ul>{value.materials.map(item => <li key={item.id}>{item.name}</li>)}</ul></section>}
    {value.design.contextual && <section><h3>情景题</h3><p>{value.design.context}</p><p>{value.design.question}</p></section>}
    {value.design.pbl && <section><h3>PBL 学习活动</h3><p>{value.design.drivingQuestion}</p><p>{value.design.product}</p><p>{value.design.stages}</p></section>}
  </div>;
}
