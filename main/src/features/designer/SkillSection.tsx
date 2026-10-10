import { ChevronDown, ChevronUp, MessageSquareText } from 'lucide-react';
import type { EducationalSkill } from '../../../shared/assistant';
import { Switch } from '@/components/ui/switch';

export function SkillSection({
  skill,
  expanded,
  onToggle,
  onAdjust,
  included,
  onToggleIncluded,
  recentlyUpdated,
}: {
  skill: EducationalSkill;
  expanded: boolean;
  onToggle: () => void;
  onAdjust: () => void;
  included: boolean;
  onToggleIncluded: () => void;
  recentlyUpdated: boolean;
}) {
  return (
    <article className={`skill-section ${expanded ? 'expanded' : ''} ${included ? '' : 'not-included'} ${recentlyUpdated ? 'recently-updated' : ''}`}>
      <div className="skill-summary">
        <button className="skill-toggle" onClick={onToggle} aria-expanded={expanded}>
          <span className="skill-symbol"><MessageSquareText /></span>
          <span className="skill-heading"><strong>{skill.name}</strong><span>{skill.summary}</span></span>
          {expanded ? <ChevronUp /> : <ChevronDown />}
        </button>
        <label className="skill-inclusion">
          <span>{included ? '已加入' : '不加入'}</span>
          <Switch checked={included} onCheckedChange={onToggleIncluded} aria-label={`将${skill.name}加入助手`} />
        </label>
      </div>
      {expanded && (
        <div className="skill-details">
          <dl>
            <div><dt>教学目的</dt><dd>{skill.purpose}</dd></div>
            <div><dt>什么时候使用</dt><dd>{skill.trigger}</dd></div>
            <div>
              <dt>助手会怎么做</dt>
              <dd><ol>{skill.steps ? skill.steps.map((step, index) => <li key={index}><p>{index === 0 ? '当' : '如果'}：{step.condition}</p><p>助手：{step.action}</p></li>) : skill.behaviorSteps.map((step, index) => <li key={index}>{step}</li>)}</ol></dd>
            </div>
            <div>
              <dt>需要遵守</dt>
              <dd>{skill.constraints.length ? <ul>{skill.constraints.map((constraint, index) => <li key={index}>{constraint}</li>)}</ul> : '未设置额外原则'}</dd>
            </div>
          </dl>
          <button className="adjust-skill" onClick={onAdjust}>{skill.steps ? '修改教学方法' : '让设计器调整'}</button>
        </div>
      )}
    </article>
  );
}
