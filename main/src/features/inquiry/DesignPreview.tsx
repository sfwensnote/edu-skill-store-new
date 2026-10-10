import type { ContextualDesign, DesignLevel } from '../../../shared/contextual-design';
import { TeachingTagList } from '@/components/TeachingTagsField';
export function DesignPreview({
  design,
  level = design.currentLevel,
  teacher = true,
}: {
  design: ContextualDesign;
  level?: DesignLevel;
  teacher?: boolean;
}) {
  const p = design.contextualProblem;
  const project = design.pblProject;
  return (
    <article className="design-preview">
      <h2>{level === 3 ? project?.name || design.title : design.title}</h2>
      <p className="subtle">
        {design.grade} {design.year} · {design.subject} · {design.knowledgePoint}
      </p>
      {teacher && <>
        {design.category && <p className="subtle">教学分类：{design.category}</p>}
        <TeachingTagList tags={design.tags} />
      </>}
      {teacher && (
        <>
          <h3>教学内容</h3>
          <p>{design.originalProblem}</p>
        </>
      )}
      {p ? (
        <>
          <h3>情境与问题</h3>
          <p>{p.context}</p>
          <p>{p.question}</p>
        </>
      ) : (
        <>
          <h3>探究内容</h3>
          <p>{design.originalProblem}</p>
        </>
      )}
      <h3>学习目标</h3>
      <p>{p?.knowledgeGoal || design.learningGoal}</p>
      {level >= 2 && design.taskChain && (
        <>
          <h3>情境任务链</h3>
          <ol>
            {design.taskChain?.tasks.map((t) => (
              <li key={t.id}>
                <h4>{t.title}</h4>
                <p>{t.requirement}</p>
                <p>学习产出：{t.output}</p>
                {teacher && <small>教师支持：{t.support}</small>}
              </li>
            ))}
          </ol>
        </>
      )}
      {level === 3 && project && (
        <>
          {(
            [
              ['驱动性问题', project.drivingQuestion],
              ['项目目标', project.goals],
              ['探究活动', project.activities],
              ['项目阶段', project.stages],
              ['所需资源', project.resources],
              ['项目成果', project.outcome],
              ['展示方式', project.presentation],
              ['评价要求', project.evaluation],
              ['实施时间与条件', project.conditions],
            ] as const
          ).map(([title, text]) => (
            <section key={title}>
              <h3>{title}</h3>
              <p>{text}</p>
            </section>
          ))}
        </>
      )}
      {teacher && p && (
        <>
          <h3>保留关系与条件</h3>
          <p>{p?.retainedRelations}</p>
          <h3>参考要点（教师用）</h3>
          <p>{p?.answerKey}</p>
          <h3>教师核对</h3>
          <p>{p?.teacherChecks}</p>
        </>
      )}
    </article>
  );
}
