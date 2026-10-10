import { Button } from '@/components/ui/button';
import { TextField, DesignSection } from './DesignFields';
import { StepSection } from '@/components/Workbench';
import {
  readinessQuestions,
  createPblProject,
  type ContextualDesign,
} from '../../../shared/contextual-design';
import { isPblReady } from '../../../shared/inquiry-workflow';
export function PblEditor({
  design,
  onUpdate,
  onReturn,
}: {
  design: ContextualDesign;
  onUpdate: (patch: Partial<ContextualDesign>) => void;
  onReturn: () => void;
}) {
  const p = design.pblProject;
  const ready = isPblReady(design);
  return (
    <>
      {!p ? (
        <DesignSection title="PBL 实施条件">
          {readinessQuestions.map((question, i) => (
            <label className="check-row" key={question}>
              <input
                type="checkbox"
                checked={design.readiness[i] || false}
                onChange={(e) =>
                  onUpdate({
                    readiness: readinessQuestions.map((_, n) =>
                      n === i ? e.target.checked : design.readiness[n] === true,
                    ),
                  })
                }
              />
              {question}
            </label>
          ))}
          <div className={ready ? 'demo-banner' : 'review-banner'}>
            {ready ? '实施条件已确认' : '实施条件未全部确认，可先保存草案。'}
          </div>
          <div className="inline-actions">
            <Button variant="outline" onClick={onReturn}>
              改为设计任务链
            </Button>
            <Button
              onClick={() =>
                onUpdate({
                  pblProject: createPblProject(design),
                  currentLevel: 3,
                  status: 'DRAFT',
                })
              }
            >
              {ready ? '整理 PBL 项目' : '开始填写项目草案'}
            </Button>
          </div>
        </DesignSection>
      ) : (
        <div className="editor-columns">
          <DesignSection title="项目依据与实施条件">
            <h3>教学内容</h3>
            <p>{design.originalProblem}</p>
            <h3>学生学习目标</h3>
            <p>{design.learningGoal}</p>
            {design.contextualProblem && (
              <>
                <h3>情境问题</h3>
                <p>{design.contextualProblem.question}</p>
              </>
            )}
            {design.taskChain && (
              <>
                <h3>关联任务</h3>
                <ol>
                  {design.taskChain?.tasks.map((t) => (
                    <li key={t.id}>
                      {t.title}
                      <p>{t.requirement}</p>
                    </li>
                  ))}
                </ol>
              </>
            )}
            <h3>PBL 条件核对</h3>
            {readinessQuestions.map((q, i) => (
              <label className="check-row" key={q}>
                <input
                  type="checkbox"
                  checked={design.readiness[i] || false}
                  onChange={(e) =>
                    onUpdate({
                      readiness: readinessQuestions.map((_, n) =>
                        n === i ? e.target.checked : design.readiness[n] === true,
                      ),
                      pblProject: { ...p, needsReview: true },
                      status: 'DRAFT',
                    })
                  }
                />
                {q}
              </label>
            ))}
            {!ready && <div className="review-banner">实施条件未全部确认，当前为草案。</div>}
          </DesignSection>
          <DesignSection title="PBL 项目方案">
            {p.needsReview && (
              <div className="review-banner">项目待核对。请检查上游题目和任务修改是否影响项目方案。</div>
            )}
            {(
              [
                {
                  title: '项目与驱动问题',
                  fields: [
                    ['name', '项目名称'],
                    ['drivingQuestion', '驱动性问题'],
                  ],
                },
                {
                  title: '项目目标与探究阶段',
                  fields: [
                    ['goals', '项目目标'],
                    ['stages', '项目阶段'],
                  ],
                },
                {
                  title: '学生任务与资源',
                  fields: [
                    ['activities', '探究活动'],
                    ['resources', '所需资源'],
                  ],
                },
                {
                  title: '预期成果与展示',
                  fields: [
                    ['outcome', '项目成果'],
                    ['presentation', '成果展示方式'],
                  ],
                },
                {
                  title: '评价与实施安排',
                  fields: [
                    ['evaluation', '评价要求'],
                    ['conditions', '实施时间与条件'],
                  ],
                },
              ] as const
            ).map((group, index) => (
              <StepSection key={group.title} number={index + 1} title={group.title}>
                {group.fields.map(([key, label]) => (
                  <TextField
                    key={key}
                    label={label}
                    value={p[key]}
                    onChange={(v) =>
                      onUpdate({
                        pblProject: { ...p, [key]: v, needsReview: true },
                        status: 'DRAFT',
                      })
                    }
                    short={key === 'name'}
                    rows={key === 'stages' ? 5 : 3}
                  />
                ))}
              </StepSection>
            ))}
            <label className="check-row">
              <input
                type="checkbox"
                checked={!p.needsReview}
                onChange={(e) =>
                  onUpdate({
                    pblProject: { ...p, needsReview: !e.target.checked },
                    status: 'DRAFT',
                  })
                }
              />
              我已核对项目目标、活动安排、成果与评价
            </label>
          </DesignSection>
        </div>
      )}
    </>
  );
}
