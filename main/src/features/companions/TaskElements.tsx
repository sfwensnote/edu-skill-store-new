import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { taskFields, type CompanionTask, type CompanionDesign } from '../../../shared/learning-companion';

export function TaskElements({ task, design, onTask, onDesign }: {
  task: CompanionTask; design: CompanionDesign;
  onTask: (value: CompanionTask) => void; onDesign: (value: CompanionDesign) => void;
}) {
  return <>
    <section><h2>教学任务要素表</h2>
      <div className="companion-task-fields">{taskFields.map(([key, label], index) => <label className={`form-field ${index > 3 ? 'companion-wide' : ''}`} key={key}>
        <span>{label}</span>
        {index < 4 ? <input required value={task[key]} onChange={event => onTask({ ...task, [key]: event.target.value })} /> :
          <Textarea required value={task[key]} onChange={event => onTask({ ...task, [key]: event.target.value })} />}
      </label>)}</div>
    </section>
    <section className="companion-options"><h2>活动设计 <small>选填</small></h2>
      <div className="inline-actions">
        <Button type="button" variant={design.contextual ? 'default' : 'outline'} aria-pressed={design.contextual} onClick={() => onDesign({ ...design, contextual: !design.contextual })}>情景化出题</Button>
        <Button type="button" variant={design.pbl ? 'default' : 'outline'} aria-pressed={design.pbl} onClick={() => onDesign({ ...design, pbl: !design.pbl })}>创建 PBL 学习活动</Button>
      </div>
      {design.contextual && <fieldset><legend>情景题设计</legend>
        <label className="form-field">教学情景<Textarea required placeholder="学生在什么具体情景中解决问题" value={design.context} onChange={event => onDesign({ ...design, context: event.target.value })} /></label>
        <label className="form-field">情景题目<Textarea required value={design.question} onChange={event => onDesign({ ...design, question: event.target.value })} /></label>
      </fieldset>}
      {design.pbl && <fieldset><legend>PBL 学习活动</legend>
        <label className="form-field">驱动问题<Textarea required value={design.drivingQuestion} onChange={event => onDesign({ ...design, drivingQuestion: event.target.value })} /></label>
        <label className="form-field">项目成果<Textarea required value={design.product} onChange={event => onDesign({ ...design, product: event.target.value })} /></label>
        <label className="form-field">活动阶段<Textarea required placeholder="每个阶段一行，写明学生做什么" value={design.stages} onChange={event => onDesign({ ...design, stages: event.target.value })} /></label>
      </fieldset>}
    </section>
  </>;
}
