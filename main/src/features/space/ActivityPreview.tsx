import { BookOpen, ClipboardCheck, Eye, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LocalTeachingTask, SkillEntry } from '../../../shared/marketplace';
import {
  simulationFingerprint,
  type LearningResource,
  type TeachingActivityDraft,
} from '../../../shared/teaching-activity';
import { SkillMethodSummary } from './LearningActivityFields';

export function ActivityPreview({
  draft,
  resources,
  entries,
  tasks,
  onDetailedPreview,
}: {
  draft: TeachingActivityDraft;
  resources: LearningResource[];
  entries: SkillEntry[];
  tasks: LocalTeachingTask[];
  onDetailedPreview: () => void;
}) {
  if (draft.path === 'learning') {
    const resource = resources.find((r) => r.key === draft.resourceKey);
    const settings = draft.settings;
    const support = entries.find((e) => e.id === draft.supportSkillId);
    return (
      <>
        <header className="activity-preview-heading">
          <Eye aria-hidden="true" />
          <div>
            <h2>学生视角预览</h2>
          </div>
        </header>
        {!resource ? (
          <div className="activity-preview-empty">
            <BookOpen aria-hidden="true" />
            <h3>先选择一份学习作品</h3>
          </div>
        ) : (
          <article className="activity-student-surface">
            <h3>{settings.title || resource.title}</h3>
            {settings.instructions && (
              <p className="activity-preview-instructions">{settings.instructions}</p>
            )}
            <section>
              <h4>学习目标</h4>
              <p>
                {resource.level === 3
                  ? resource.design.pblProject?.goals
                  : resource.design.contextualProblem?.knowledgeGoal || resource.design.learningGoal}
              </p>
            </section>
            <section>
              <h4>作品内容</h4>
              <p>
                {resource.level === 3
                  ? resource.design.pblProject?.drivingQuestion
                  : resource.design.contextualProblem?.context}
              </p>
              <p>{resource.level === 1 ? resource.design.contextualProblem?.question : ''}</p>
              {resource.level === 2 && (
                <ol>
                  {resource.design.taskChain?.tasks.map((task) => (
                    <li key={task.id}>
                      <strong>{task.title}</strong>
                      <p>{task.requirement}</p>
                      <small>学习产出：{task.output}</small>
                    </li>
                  ))}
                </ol>
              )}
              {resource.level === 3 && (
                <>
                  <ol>
                    {resource.design.pblProject?.stages
                      .split('\n')
                      .filter((s) => s.trim())
                      .map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                  </ol>
                  <p>项目成果：{resource.design.pblProject?.outcome}</p>
                </>
              )}
              <Button variant="link" onClick={onDetailedPreview}>
                查看详细设计
              </Button>
            </section>
            {draft.step >= 2 && (
              <section>
                <h4>任务安排</h4>
                <dl>
                  <div>
                    <dt>学习对象</dt>
                    <dd>
                      {settings.audience === 'controlled'
                        ? '受控访问（尚未开放）'
                        : settings.audienceLabel || '待填写'}
                    </dd>
                  </div>
                  <div>
                    <dt>开始</dt>
                    <dd>{settings.startsAt.replace('T', ' ') || '未设置'}</dd>
                  </div>
                  <div>
                    <dt>截止</dt>
                    <dd>{settings.endsAt.replace('T', ' ') || '未设置'}</dd>
                  </div>
                  <div>
                    <dt>提交方式</dt>
                    <dd>{settings.submission === 'stages' ? '逐项记录任务或阶段' : '文字回答'}</dd>
                  </div>
                  <div>
                    <dt>尝试次数</dt>
                    <dd>{settings.allowRetry ? '允许重试' : '一次提交'}</dd>
                  </div>
                  <div>
                    <dt>反馈</dt>
                    <dd>
                      {settings.feedbackTiming === 'teacher' ? '等待教师反馈' : '提交后查看教师预设提示'}
                    </dd>
                  </div>
                </dl>
              </section>
            )}
            {draft.step >= 3 && (
              <section>
                <h4>
                  <Sparkles aria-hidden="true" />
                  智能教学支持
                </h4>
                <p>{support ? `${support.skill.name} · ${support.version}` : '不使用教学 SKILL'}</p>
                {support && (
                  <>
                    <p>触发：{support.skill.trigger}</p>
                    <p className="activity-help">已配置支持，预览中不自动执行。</p>
                  </>
                )}
              </section>
            )}
            {draft.step === 4 && (
              <section>
                <h4>学习记录</h4>
                <div className="activity-answer-placeholder">写下你的过程、依据或遇到的问题……</div>
              </section>
            )}
          </article>
        )}
      </>
    );
  }
  const entry = entries.find((e) => e.id === draft.skillId);
  const target = tasks.find((t) => t.id === draft.targetTaskId);
  const simulation =
    draft.simulation?.fingerprint === simulationFingerprint(draft, entry, target)
      ? draft.simulation
      : undefined;
  return (
    <>
      <header className="activity-preview-heading">
        <ClipboardCheck aria-hidden="true" />
        <div>
          <h2>{draft.step < 3 ? '方法应用预览' : '执行计划预览'}</h2>
          {draft.step >= 3 && <p>规则模拟 · 未真实执行</p>}
        </div>
      </header>
      {!entry ? (
        <div className="activity-preview-empty">
          <Sparkles aria-hidden="true" />
          <h3>选择一项教学 SKILL</h3>
        </div>
      ) : (
        <div className="activity-agent-surface">
          {draft.step < 3 ? (
            <>
              <SkillMethodSummary entry={entry} />
              {draft.step === 2 && (
                <section>
                  <h4>应用位置</h4>
                  <p>{target?.title || '待选择教学任务'}</p>
                  <h4>允许介入的情境</h4>
                  <p>{draft.scope || '待填写'}</p>
                  <h4>运行权限</h4>
                  <p>仅提供教学提示，不能代答或代替学生提交。</p>
                </section>
              )}
            </>
          ) : (
            <>
              <h3>
                {entry.skill.name}
                <small>{entry.version}</small>
              </h3>
              {!simulation ? (
                <p className="activity-notice">请查看模拟步骤。配置或版本变化后需重新模拟。</p>
              ) : (
                <div className="activity-evidence-list">
                  <section>
                    <h4>测试情境</h4>
                    <p>{simulation.scenario}</p>
                  </section>
                  <section>
                    <h4>是否触发 SKILL</h4>
                    <p>
                      {simulation.assessment === 'trigger'
                        ? '教师判断：符合触发条件'
                        : simulation.assessment === 'no-trigger'
                          ? '教师判断：不符合，计划不介入'
                          : '教师尚未确定，计划不介入'}
                    </p>
                    <small>系统未独立识别学生情境。</small>
                  </section>
                  <section>
                    <h4>实际执行</h4>
                    <p>未执行，尚无真实响应。</p>
                  </section>
                  <section>
                    <h4>计划执行的步骤</h4>
                    {simulation.plannedSteps.length ? (
                      <ol>
                        {simulation.plannedSteps.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                    ) : (
                      <p>当前判断下不展开方法。</p>
                    )}
                  </section>
                  <section>
                    <h4>教学原则 · 待执行验证</h4>
                    {entry.skill.constraints.map((constraint, i) => (
                      <p key={i}>{constraint}</p>
                    ))}
                    {!entry.skill.constraints.length && <p>未填写教学原则，请回到方法流程补充。</p>}
                  </section>
                  <section>
                    <h4>退出结果</h4>
                    <p>
                      {simulation.assessment === 'trigger'
                        ? `${entry.skill.constraints.find((item) => item.startsWith('结束条件：')) || '退出条件待方法补充'}；真实退出结果待验证。`
                        : '模拟不介入；真实退出结果待验证。'}
                    </p>
                  </section>
                </div>
              )}
              {draft.step === 4 && (
                <p className="activity-help">
                  配置检查记录：
                  {simulation && draft.teacherReviewed ? '教师已检查模拟计划' : '待教师检查模拟计划'}
                  。教学效果尚未验证。
                </p>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
