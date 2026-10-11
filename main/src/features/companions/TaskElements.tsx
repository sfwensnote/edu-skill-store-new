import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { learningAudiences, learningScenarios, taskFields, type CompanionTask, type CompanionDesign } from '../../../shared/learning-companion';

export function TaskElements({ task, design, onTask, onDesign }: {
  task: CompanionTask; design: CompanionDesign;
  onTask: (value: CompanionTask) => void; onDesign: (value: CompanionDesign) => void;
}) {
  return <>
    <div className="companion-scene-fields">
      <div className="companion-scene-selects">
        {([['audience', '学习对象', learningAudiences], ['scenario', '学习情境', learningScenarios]] as const).map(([key, label, options]) =>
          <label className="form-field" key={key}>{label}<select required value={task[key]} onChange={event => onTask({ ...task, [key]: event.target.value })}>
            <option value="">请选择{label}</option>
            {[...new Set([...options, task[key]].filter(Boolean))].map(option => <option key={option}>{option}</option>)}
          </select></label>)}
      </div>
      <label className="form-field">学习任务与目标
        <Textarea required minRows={6} maxLength={4000} value={task.taskAndGoals}
          placeholder="学生要完成什么任务？完成后应学会什么？"
          onChange={event => onTask({ ...task, taskAndGoals: event.target.value })} />
      </label>
    </div>
    <details className="companion-extra"><summary>活动设计（选填）</summary>
      <div className="companion-options">
        <div className="inline-actions">
          <Button type="button" variant={design.contextual ? 'default' : 'outline'} aria-pressed={design.contextual} onClick={() => onDesign({ ...design, contextual: !design.contextual })}>情景化出题</Button>
          <Button type="button" variant={design.pbl ? 'default' : 'outline'} aria-pressed={design.pbl} onClick={() => onDesign({ ...design, pbl: !design.pbl })}>创建 PBL 学习活动</Button>
        </div>
        {design.contextual && <fieldset><legend>情景题设计</legend>
          <label className="form-field">教学情景<Textarea required value={design.context} onChange={event => onDesign({ ...design, context: event.target.value })} /></label>
          <label className="form-field">情景题目<Textarea required value={design.question} onChange={event => onDesign({ ...design, question: event.target.value })} /></label>
        </fieldset>}
        {design.pbl && <fieldset><legend>PBL 学习活动</legend>
          <label className="form-field">驱动问题<Textarea required value={design.drivingQuestion} onChange={event => onDesign({ ...design, drivingQuestion: event.target.value })} /></label>
          <label className="form-field">项目成果<Textarea required value={design.product} onChange={event => onDesign({ ...design, product: event.target.value })} /></label>
          <label className="form-field">活动阶段<Textarea required value={design.stages} onChange={event => onDesign({ ...design, stages: event.target.value })} /></label>
        </fieldset>}
      </div>
    </details>
  </>;
}

export function TaskSummary({ task }: { task: CompanionTask }) {
  return <dl className="companion-task-summary">{taskFields.map(([key, label]) =>
    <div key={key}><dt>{label}</dt><dd>{task[key] || '未设置'}</dd></div>)}</dl>;
}
