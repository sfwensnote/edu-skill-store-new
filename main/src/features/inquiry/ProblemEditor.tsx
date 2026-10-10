import { Button } from '@/components/ui/button';
import { TextField, DesignSection } from './DesignFields';
import {
  buildContextualProblem,
  invalidateContext,
  type ContextualDesign,
  type ContextualProblem,
} from '../../../shared/contextual-design';
export function ProblemEditor({
  design,
  onUpdate,
  onMessage,
}: {
  design: ContextualDesign;
  onUpdate: (patch: Partial<ContextualDesign>) => void;
  onMessage: (s: string) => void;
}) {
  const p = design.contextualProblem;
  function changeOutput(key: keyof ContextualProblem, value: string) {
    if (p)
      onUpdate(
        invalidateContext(design, {
          contextualProblem: { ...p, [key]: value },
          title: key === 'title' ? value : design.title,
        }),
      );
  }
  return (
    <div className="editor-columns">
      <DesignSection title="原题与目标">
        <TextField
          label="原题 / 教学内容"
          value={design.originalProblem}
          onChange={(originalProblem) => onUpdate(invalidateContext(design, { originalProblem }))}
        />
        <TextField
          label="本次学习目标"
          value={design.learningGoal}
          onChange={(learningGoal) => onUpdate(invalidateContext(design, { learningGoal }))}
        />
        <TextField
          label="知识点"
          value={design.knowledgePoint}
          short
          onChange={(knowledgePoint) => onUpdate(invalidateContext(design, { knowledgePoint }))}
        />
        <TextField
          label="情境偏好"
          value={design.customContext}
          onChange={(customContext) => onUpdate(invalidateContext(design, { customContext }))}
        />
        <Button
          variant={p ? 'outline' : 'default'}
          disabled={!design.originalProblem.trim() || !design.learningGoal.trim()}
          onClick={() => {
            if (
              p &&
              !window.confirm('重新整理将替换右侧情境题目。现有任务链和项目会保留并标记待核对，继续吗？')
            )
              return;
            const problem = buildContextualProblem(design);
            onUpdate(
              invalidateContext(design, {
                contextualProblem: problem,
                title: problem.title,
              }),
            );
            onMessage(
              problem.mode === 'sample'
                ? '已填入参考案例，请逐项核对并调整。'
                : '已保留原题并建立可编辑框架，请补全情境、关系和参考要点。',
            );
          }}
        >
          {p ? '重新整理题目' : '整理情境题目'}
        </Button>
      </DesignSection>
      <DesignSection title="情境题目">
        {p ? (
          <>
            <span className="content-label">{p.mode === 'sample' ? '参考案例' : '教师设计'}</span>
            {(
              [
                ['title', '情境标题'],
                ['context', '情境描述'],
                ['question', '学生问题'],
                ['knowledgeGoal', '知识目标'],
                ['retainedRelations', '保留的知识要求 / 关键条件'],
                ['answerKey', '参考要点（教师用，可选）'],
                ['teacherChecks', '需要教师确认的事项'],
              ] as const
            ).map(([key, label]) => (
              <TextField
                key={key}
                label={label}
                value={p[key]}
                onChange={(v) => changeOutput(key, v)}
                short={key === 'title'}
              />
            ))}
            <label className="check-row">
              <input
                type="checkbox"
                checked={p.confirmed}
                onChange={(e) =>
                  onUpdate({
                    contextualProblem: { ...p, confirmed: e.target.checked },
                    status: 'DRAFT',
                  })
                }
              />
              我已核对数据、知识要求、单位、范围和可解性
            </label>
          </>
        ) : (
          <div className="empty-state">先填写原题并点击「整理情境题目」。</div>
        )}
      </DesignSection>
    </div>
  );
}
