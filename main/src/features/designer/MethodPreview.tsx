import type { TeachingMethod } from '../../../shared/teaching-method';
import { TeachingTagList } from '@/components/TeachingTagsField';
import { isTeachingCategory } from '../../../shared/teaching-tags';
import { SkillIcon } from '@/components/SkillIcon';
import { Target, UserRound, ListOrdered, FileText } from 'lucide-react';
import './method-preview.css';

export function MethodPreview({ method }: { method: TeachingMethod }) {
  const category = isTeachingCategory(method.category) ? method.category : undefined;
  return (
    <div className="method-preview-content">
      <div className="method-preview-hero">
        <div className="method-preview-hero-icon">
          <SkillIcon category={category || '未分类'} icon={method.icon} />
        </div>
        <div className="method-preview-hero-body">
          <h3 className="method-preview-name">{method.name || '未命名教学方法'}</h3>
          <p className="method-preview-description">{method.description || '简介待补充'}</p>
          <div className="method-preview-meta">
            {category && <span className="method-preview-category">{category}</span>}
            <TeachingTagList tags={method.tags} />
          </div>
        </div>
      </div>

      <section className="method-preview-section">
        <h4><Target aria-hidden="true" />教学目标</h4>
        <p>{method.expectedOutcome || method.problem || '待补充'}</p>
      </section>

      <section className="method-preview-section">
        <h4><UserRound aria-hidden="true" />适用条件</h4>
        <p>{method.trigger || '待补充'}</p>
      </section>

      <section className="method-preview-section">
        <h4><ListOrdered aria-hidden="true" />教学步骤</h4>
        {method.teachingSteps.map((step, index) => (
          <div className="preview-method-step" key={index}>
            <span className="step-number">{index + 1}</span>
            <div className="preview-method-step-body">
              <p className="preview-method-step-line">
                <strong>当</strong>：{step.condition || '待补充'}
              </p>
              <p className="preview-method-step-line">
                <strong>我会</strong>：{step.action || '待补充'}
              </p>
            </div>
          </div>
        ))}
        {!method.teachingSteps.length && <p>待补充</p>}
      </section>

      <section className="method-preview-section">
        <h4><FileText aria-hidden="true" />教学原则</h4>
        <ul>
          {method.principles.filter(Boolean).map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
        {!method.principles.some(Boolean) && <p>待补充</p>}
      </section>
    </div>
  );
}
