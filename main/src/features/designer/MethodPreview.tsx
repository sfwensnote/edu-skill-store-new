import type { TeachingMethod } from '../../../shared/teaching-method';
import { TeachingTagList } from '@/components/TeachingTagsField';
import { isTeachingCategory } from '../../../shared/teaching-tags';

export function MethodPreview({ method }: { method: TeachingMethod }) {
  return (
    <div className="method-preview-content">
      <h3>{method.name || '未命名教学方法'}</h3>
      <p>{method.description || '简介待补充'}</p>
      {isTeachingCategory(method.category) && <p>教学分类：{method.category}</p>}
      <TeachingTagList tags={method.tags} />
      <h4>教学目标</h4>
      <p>{method.expectedOutcome || method.problem || '待补充'}</p>
      <h4>适用条件</h4>
      <p>{method.trigger || '待补充'}</p>
      <h4>教学步骤</h4>
      {method.teachingSteps.map((step, index) => (
        <div className="preview-method-step" key={index}>
          <span className="step-number">{index + 1}</span>
          <div>
            <p>当：{step.condition || '待补充'}</p>
            <p>我会：{step.action || '待补充'}</p>
          </div>
        </div>
      ))}
      {!method.teachingSteps.length && <p>待补充</p>}
      <h4>教学原则</h4>
      <ul>
        {method.principles.filter(Boolean).map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
      {!method.principles.some(Boolean) && <p>待补充</p>}
    </div>
  );
}
