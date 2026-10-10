import { ArrowRight, CircleDot } from 'lucide-react';
import type { DemoTestCase } from './testData';
import { Button } from '@/components/ui/button';

export function TestCaseRecord({
  testCase,
  index,
  total,
  onConfirm,
  onEdit,
}: {
  testCase: DemoTestCase;
  index: number;
  total: number;
  onConfirm: () => void;
  onEdit: () => void;
}) {
  return (
    <section className="test-record">
      <div className="test-case-head">
        <h2>{testCase.title}</h2>
      </div>
      <p className="scenario-copy">{testCase.scenario}</p>
      {!testCase.methodReview && (
        <div className="test-question">
          <span>题目</span>
          <strong>解方程：3x + 6 = 12</strong>
        </div>
      )}
      <div className="simulation-flow">
        <div className="simulation-line student">
          <span className="speaker">学生输入</span>
          <p>{testCase.studentInput}</p>
        </div>
        <div className="flow-line">
          <CircleDot />
        </div>
        <div className="simulation-line assistant">
          <span className="speaker">模型回复</span>
          <p>{testCase.assistantOutput}</p>
        </div>
      </div>
      <div className="check-list">
        {testCase.expectedAction && <p>预期做法：{testCase.expectedAction}</p>}
        <h2>需要核对的原则</h2>
        {testCase.checks.map((check) => (
          <p key={check}>
            <CircleDot />
            {check}
          </p>
        ))}
        {testCase.attention && <p className="attention-note">{testCase.attention}</p>}
      </div>
      <div className="case-confirmation">
        <Button variant="outline" onClick={onEdit}>修改当前方法</Button>
        <Button size="lg" onClick={onConfirm}>
          {index === total - 1 ? '确认并完成' : '确认并继续'}
          <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
    </section>
  );
}
