import type { LearningCompanion } from '../../../shared/learning-companion';
import type { SkillEntry } from '../../../shared/marketplace';
import { boundaryPrefix, methodFromSkill } from '../../../shared/teaching-method';
import { TaskSummary } from './TaskElements';

export function MethodRequirements({ entry }: { entry: SkillEntry }) {
  const method = methodFromSkill(entry.skill);
  const principles = method.principles.filter(text => !text.startsWith(boundaryPrefix));
  const ending = method.principles.find(text => text.startsWith(boundaryPrefix))?.slice(boundaryPrefix.length).trim();
  return <div className="method-requirements">
    <dl className="requirements-fields"><div><dt>学习目标</dt><dd>{method.expectedOutcome}</dd></div><div><dt>开始条件</dt><dd>{method.trigger}</dd></div></dl>
    <ol className="requirements-steps">{method.teachingSteps.map((step, index) => <li key={index}>
      <dl className="requirements-fields"><div><dt>情况 {index + 1}</dt><dd>{step.condition}</dd></div><div><dt>教师做法</dt><dd>{step.action}</dd></div></dl>
    </li>)}</ol>
    {!!principles.length && <div className="requirements-principles"><h4>教学原则</h4><ul>{principles.map((text, index) => <li key={index}>{text}</li>)}</ul></div>}
    {ending && <dl className="requirements-fields"><div><dt>结束条件</dt><dd>{ending}</dd></div></dl>}
  </div>;
}
export function CompanionRequirements({ value, skills }: { value: LearningCompanion; skills: SkillEntry[] }) {
  const selected = value.skillIds.flatMap(id => skills.filter(entry => entry.id === id));
  return <details className="market-panel companion-overview-panel companion-overview-requirements">
    <summary>学伴教学要求</summary>
    <div className="requirements-content">
      <section><h3>学习场景</h3><TaskSummary task={value.task} /></section>
      {selected.map(entry => <section key={entry.id}><h3>{entry.skill.name}</h3><MethodRequirements entry={entry} /></section>)}
      {!selected.length && <p className="subtle">尚未挂载教学方法</p>}
    </div>
  </details>;
}
