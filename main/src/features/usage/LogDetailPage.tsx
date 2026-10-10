import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { TeachingAssistant } from '../../../shared/assistant';
import { MethodSteps } from './MethodSteps';

export function LogDetailPage({
  assistant,
  sessionId,
  onBack,
  onPreview,
}: {
  assistant: TeachingAssistant;
  sessionId: string;
  onBack: () => void;
  onPreview: (index: number) => void;
}) {
  const skill = assistant.skills.find((item) => item.id === sessionId);
  if (!skill)
    return (
      <main className="page-frame not-found">
        <h1>没有找到这项方法</h1>
        <p>方法已移除或版本已变化。</p>
        <Button onClick={onBack}>返回教学预览</Button>
      </main>
    );
  return (
    <main className="detail-page page-frame method-detail-page">
      <button className="back-link" onClick={onBack}>
        <ArrowLeft />
        返回教学预览
      </button>
      <div className="method-detail-heading">
        <div>
          <p>{assistant.name} · v{assistant.revision || 1}.0</p>
          <h1>{skill.name}</h1>
          <p className="section-help">教师设定的方法，实际执行待验证。</p>
        </div>
        <Button onClick={() => onPreview(0)}>学生视角预览</Button>
      </div>
      <MethodSteps skill={skill} onPreview={onPreview} />
      <footer className="method-detail-footer"><Button variant="outline" onClick={onBack}>返回方法列表</Button></footer>
    </main>
  );
}
