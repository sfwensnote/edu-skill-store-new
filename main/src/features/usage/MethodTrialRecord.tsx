import { ArrowLeft } from 'lucide-react';
import type { LocalTeachingTask } from '../../../shared/marketplace';
import { MethodSteps } from './MethodSteps';

export function MethodTrialRecord({ task, onBack }: { task: LocalTeachingTask; onBack: () => void }) {
  return <main className="page-frame detail-page method-detail-page">
    <button className="back-link" onClick={onBack}><ArrowLeft />返回我的教学方法</button>
    <header className="method-detail-heading"><div>
      <p>历史方法试用</p>
      <h1>{task.skill?.skill.name || task.title}</h1>
    </div></header>
    {task.skill && <MethodSteps skill={task.skill.skill} />}
    <section className="method-boundaries">
      <h2>试用记录</h2>
      {!task.submissions.length && <p className="section-help">没有保存的试用回答。</p>}
      {task.submissions.map((submission, index) => <article className="report-method" key={index}>
        <h3>试用 {index + 1}</h3>
        {Object.entries(submission.answers).map(([key, value]) => <p className="preserve-lines" key={key}>{value}</p>)}
        <p className="section-help">教师预设提示：{submission.feedback}</p>
      </article>)}
    </section>
  </main>;
}
