import { ArrowUp, ArrowDown, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TextField, DesignSection } from './DesignFields';
import type { ContextualDesign, LearningTask } from '../../../shared/contextual-design';
export function ChainEditor({
  design,
  onUpdate,
}: {
  design: ContextualDesign;
  onUpdate: (patch: Partial<ContextualDesign>) => void;
}) {
  const chain = design.taskChain;
  if (!chain) return null;
  function tasksChanged(tasks: LearningTask[]) {
    onUpdate({
      taskChain: { tasks, needsReview: true },
      pblProject: design.pblProject ? { ...design.pblProject, needsReview: true } : null,
      status: 'DRAFT',
    });
  }
  function move(index: number, delta: number) {
    const tasks = [...chain!.tasks];
    [tasks[index], tasks[index + delta]] = [tasks[index + delta], tasks[index]];
    tasksChanged(tasks);
  }
  return (
    <div className="editor-columns">
      <DesignSection title="情境题目与设计目标">
        <h3>{design.contextualProblem?.title || design.title}</h3>
        <p>{design.contextualProblem?.context}</p>
        <p>{design.contextualProblem?.question || design.originalProblem}</p>
        <h3>知识目标</h3>
        <p>{design.contextualProblem?.knowledgeGoal || design.learningGoal}</p>
      </DesignSection>
      <DesignSection title="情境任务链">
        {chain.needsReview && (
          <div className="review-banner">
            任务链待核对。原题或情境修改不会覆盖任务，请检查关联条件与数据。
          </div>
        )}
        {chain.tasks.map((task, index) => (
          <article className="task-editor" key={task.id}>
            <div className="task-editor-heading">
              <span className="step-number">{index + 1}</span>
              <strong>任务 {index + 1}</strong>
              <div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={index === 0}
                  aria-label={`上移任务 ${index + 1}`}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={index === chain.tasks.length - 1}
                  aria-label={`下移任务 ${index + 1}`}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`删除任务 ${index + 1}`}
                  onClick={() => {
                    if (window.confirm(`删除任务“${task.title || index + 1}”？`))
                      tasksChanged(chain.tasks.filter((t) => t.id !== task.id));
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
            {(
              [
                ['title', '任务标题'],
                ['requirement', '任务要求'],
                ['competency', '对应能力'],
                ['output', '学习产出'],
                ['support', '教师支持'],
              ] as const
            ).map(([key, label]) => (
              <TextField
                key={key}
                label={`${label} ${index + 1}`}
                value={task[key]}
                onChange={(v) =>
                  tasksChanged(chain.tasks.map((t) => (t.id === task.id ? { ...t, [key]: v } : t)))
                }
                short={key === 'title' || key === 'competency'}
              />
            ))}
          </article>
        ))}
        <Button
          variant="outline"
          onClick={() =>
            tasksChanged([
              ...chain.tasks,
              {
                id: crypto.randomUUID(),
                title: '新任务',
                requirement: '',
                competency: design.knowledgePoint,
                output: '',
                support: '',
              },
            ])
          }
        >
          <Plus />
          添加任务
        </Button>
        <label className="check-row">
          <input
            type="checkbox"
            checked={!chain.needsReview}
            onChange={(e) =>
              onUpdate({
                taskChain: { ...chain, needsReview: !e.target.checked },
                status: 'DRAFT',
              })
            }
          />
          我已核对任务的递进关系、原题条件和学习产出
        </label>
      </DesignSection>
    </div>
  );
}
