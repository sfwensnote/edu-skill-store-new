import { ArrowLeft, CheckCircle2, Play, Share2 } from 'lucide-react';
import type { TeachingAssistant } from '../../../shared/assistant';
import { Button } from '@/components/ui/button';
import './review.css';
import { isMethodReviewed } from '../../../shared/method-review';

export function ReportPage({
  assistant,
  onBack,
  onOpenPreview,
  onPublish,
  onEdit,
  onCheck,
  shared,
  onMarket,
}: {
  assistant: TeachingAssistant;
  onBack: () => void;
  onOpenPreview: () => void;
  onPublish?: () => void;
  onEdit: () => void;
  onCheck: () => void;
  shared: boolean;
  onMarket: () => void;
}) {
  const checked = isMethodReviewed(assistant);
  return (
    <main className="report-page-new page-frame narrow-frame">
      <button className="back-link" onClick={onBack}>
        <ArrowLeft />
        返回我的教学方法
      </button>
      <div className="report-heading">
        <h1>核对摘要</h1>
        <p>{assistant.name}</p>
        <Button variant="outline" onClick={onOpenPreview}>
          <Play data-icon="inline-start" />
          学生视角预览
        </Button>
      </div>
      <section className="report-lead">
        <CheckCircle2 />
        <div>
          <h2>{checked ? '教师已核对方法内容' : '方法内容待核对'}</h2>
        </div>
      </section>
      <section className="report-methods-summary">
          <h2>本次核对的方法</h2>
          {assistant.skills.map((skill) => (
            <div className="report-method" key={skill.id}>
              <h3>{skill.name}</h3>
              <p>{skill.purpose}</p>
            </div>
          ))}
          {!assistant.skills.length && <p>尚未形成教学方法，请返回创建流程。</p>}
      </section>
      <footer className="report-publish">
          <div>
            <h2>{shared && checked ? '方法已发布到集市' : '发布到教学方法集市'}</h2>
          </div>
          <div className="inline-actions">
            <Button variant="outline" onClick={onEdit}>修改方法</Button>
            {!checked ? <Button onClick={onCheck}>教学方法验证</Button> : shared ?
              <Button onClick={onMarket}>查看集市</Button> : onPublish &&
              <Button onClick={onPublish}><Share2 data-icon="inline-start" />发布到集市</Button>}
          </div>
      </footer>
    </main>
  );
}
