import { Check, Circle, CircleDot, TriangleAlert } from 'lucide-react';
import type { EducationalSkill } from '../../../shared/assistant';
import type { DemoTestCase } from './testData';
import { Button } from '@/components/ui/button';

export function SkillResults({
  skills,
  cases,
  completed,
  onEdit,
}: {
  skills: EducationalSkill[];
  cases: DemoTestCase[];
  completed: number;
  onEdit: (skillId: string) => void;
}) {
  return (
    <aside className="skill-results">
      <header>
        <h2>教学方法核对结果</h2>
      </header>
      <div className="result-stack">
        {skills.map((skill) => {
          const own = cases.filter((item) => item.skillId === skill.id);
          const done = own.filter((item) => cases.indexOf(item) < completed);
          const attention = done.some((item) => item.attention);
          const finished = done.length === own.length;
          const active = !finished && own.some((item) => cases.indexOf(item) === completed);
          return (
            <article className="skill-result-row" key={skill.id}>
              <span
                className={`result-icon ${finished ? (attention ? 'attention' : 'passed') : active ? 'running' : 'waiting'}`}
              >
                {finished ? (
                  attention ? (
                    <TriangleAlert />
                  ) : (
                    <Check />
                  )
                ) : active ? (
                  <CircleDot />
                ) : (
                  <Circle />
                )}
              </span>
              <div>
                <strong>{skill.name}</strong>
                <span>
                  {finished
                    ? skill.steps
                      ? '教师已确认'
                      : attention
                        ? '示例需关注'
                        : '示例已核对'
                    : active
                      ? '核对中'
                      : '等待核对'}
                </span>
                <small>
                  {done.length} / {own.length}
                </small>
                <Button variant="link" size="sm" onClick={() => onEdit(skill.id)}>修改方法</Button>
              </div>
            </article>
          );
        })}
      </div>
    </aside>
  );
}
