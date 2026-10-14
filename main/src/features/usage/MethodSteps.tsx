import type { EducationalSkill } from '../../../shared/assistant';
import { Button } from '@/components/ui/button';
import './method-steps.css';

export function MethodSteps({ skill, onPreview, actionsOnly = false }: {
  skill: EducationalSkill;
  onPreview?: (index: number) => void;
  actionsOnly?: boolean;
}) {
  const steps = skill.steps?.length
    ? skill.steps
    : skill.behaviorSteps.map((action, index) => ({
        condition: index === 0 ? skill.trigger : '在原适用范围内，完成上一步后继续',
        action,
      }));
  return (
    <div className="method-reading">
      <dl className="method-context">
        <div><dt>学习目标</dt><dd>{skill.purpose}</dd></div>
        <div><dt>何时开始</dt><dd>{skill.trigger}</dd></div>
      </dl>
      <ol className="method-step-list" aria-label="方法步骤">
        {steps.map((step, index) => (
          <li key={index}>
            <header>
              <h3>步骤 {index + 1}</h3>
              {onPreview && <Button variant="outline" size="sm" onClick={() => onPreview(index)}>预览这一步</Button>}
            </header>
            {actionsOnly ? <p className="method-step-text">{step.action}</p> : <dl>
              <div><dt>学生表现</dt><dd>{step.condition}</dd></div>
              <div className="method-step-action"><dt>教师做法</dt><dd>{step.action}</dd></div>
            </dl>}
          </li>
        ))}
      </ol>
      {skill.constraints.length > 0 && (
        <section className="method-boundaries">
          <h2>教学原则</h2>
          <ul>{skill.constraints.map((item, index) => <li key={index}>{item}</li>)}</ul>
        </section>
      )}
    </div>
  );
}
