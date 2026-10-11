import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { PencilLine, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StepSection } from '@/components/Workbench';
import { boundaryPrefix, type TeachingMethod } from '../../../shared/teaching-method';
import { TeachingCategoryField, TeachingTagsField } from '@/components/TeachingTagsField';
import { SkillIconField } from '@/components/SkillIconField';

function EditableText({
  label,
  value,
  onChange,
  placeholder = '待补充',
  maxLength = 500,
  required = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  required?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="method-editable">
      {editing ? (
        <Textarea
          aria-label={label}
          required={required}
          aria-invalid={required && !value.trim()}
          autoFocus
          value={value}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => setEditing(false)}
          rows={2}
        />
      ) : (
        <button
          type="button"
          className={`method-edit-button ${value.trim() ? '' : 'is-empty'}`}
          aria-label={`编辑${label}`}
          onClick={() => setEditing(true)}
        >
          <span>{value.trim() || placeholder}</span>
          <small aria-hidden="true">
            <PencilLine size={14} />
          </small>
        </button>
      )}
      {editing && value.length >= maxLength * 0.9 && (
        <span className="field-count">还可输入 {maxLength - value.length} 字</span>
      )}
    </div>
  );
}

export function MethodOutline({
  method,
  onChange,
  updatedSection,
  onIconBusy,
}: {
  method: TeachingMethod;
  onChange: (method: TeachingMethod, field?: string) => void;
  updatedSection: number | null;
  onIconBusy?: (busy: boolean) => void;
}) {
  const boundary =
    method.principles.find((item) => item.startsWith(boundaryPrefix))?.slice(boundaryPrefix.length) || '';
  const field = (
    label: string,
    key: 'name' | 'description' | 'problem' | 'expectedOutcome' | 'trigger',
    placeholder?: string,
  ) => (
    <div className="outline-field">
      <h4>{label}<span className="required-mark" aria-hidden="true"> *</span></h4>
      <EditableText
        label={label}
        value={method[key] || ''}
        placeholder={placeholder}
        maxLength={key === 'name' ? 80 : 800}
        onChange={(value) => onChange({ ...method, [key]: value }, key)}
      />
    </div>
  );
  function updateStep(index: number, key: 'condition' | 'action', value: string) {
    onChange(
      {
        ...method,
        teachingSteps: method.teachingSteps.map((step, i) =>
          i === index ? { ...step, [key]: value } : step,
        ),
      },
      `step-${index}-${key}`,
    );
  }
  return (
    <div
      className="method-sections"
      onMouseDown={(event) => {
        // 编辑框失焦收起会移动鼠标下的按钮，先完成点击再切换字段。
        if ((event.target as Element).closest('button')) event.preventDefault();
      }}
    >
      <StepSection number={1} title="基础概况" updated={updatedSection === 1}>
        {field('SKILL 名称', 'name', '为你的教学方法起一个名字')}
        {field('SKILL 简介', 'description', '用一句话说明这个方法的用途')}
        <TeachingCategoryField value={method.category} onChange={(category) => onChange({ ...method, category }, 'category')} />
        <SkillIconField category={method.category} value={method.icon} onBusy={onIconBusy} onChange={icon => onChange({ ...method, icon }, 'icon')} />
        <TeachingTagsField required value={method.tags} onChange={(tags) => onChange({ ...method, tags }, 'tags')} />
      </StepSection>
      <StepSection number={2} title="教学目标框架" updated={updatedSection === 2}>
        <p className="method-completion-hint">以下内容可通过左侧提示自动补全</p>
        {field('想解决的问题', 'problem')}
        {field('希望学生达到', 'expectedOutcome')}
        {field('什么时候开始', 'trigger')}
      </StepSection>
      <StepSection number={3} title="我会怎么做" updated={updatedSection === 3}>
        {method.teachingSteps.length ? (
          method.teachingSteps.map((step, index) => (
            <div className="outline-step" key={index}>
              <div className="step-top">
                <strong>关键情况 {index + 1}</strong>
                {index > 0 && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`删除情况 ${index + 1}`}
                    onClick={() =>
                      onChange({
                        ...method,
                        teachingSteps: method.teachingSteps.filter((_, i) => i !== index),
                      })
                    }
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
              <div className="outline-field">
                <h4>{index === 0 ? '当学生……' : '如果学生……'}<span className="required-mark" aria-hidden="true"> *</span></h4>
                <EditableText
                  label={`情况 ${index + 1}`}
                  value={step.condition}
                  onChange={(value) => updateStep(index, 'condition', value)}
                />
              </div>
              <div className="outline-field">
                <h4>我会……<span className="required-mark" aria-hidden="true"> *</span></h4>
                <EditableText
                  label={`做法 ${index + 1}`}
                  value={step.action}
                  onChange={(value) => updateStep(index, 'action', value)}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="empty-method">回答当前问题，或直接补充你的教学做法。</p>
        )}
        <Button
          className="add-method-row"
          variant="ghost"
          size="sm"
          disabled={method.teachingSteps.length >= 8}
          title={method.teachingSteps.length >= 8 ? '一项 SKILL 最多保留八种情况' : undefined}
          onClick={() =>
            onChange({ ...method, teachingSteps: [...method.teachingSteps, { condition: '', action: '' }] })
          }
        >
          <Plus data-icon="inline-start" />
          补充一种情况和做法
        </Button>
        {method.teachingSteps.length >= 8 && <p className="subtle">已达八种情况，可合并相近做法后再补充。</p>}
      </StepSection>
      <StepSection number={4} title="我的原则（选填）" updated={updatedSection === 4}>
        {method.principles.some((item) => !item.startsWith(boundaryPrefix)) ? (
          method.principles.map((principle, index) => ({ principle, index }))
            .filter(({ principle }) => !principle.startsWith(boundaryPrefix))
            .map(({ principle, index }, principleIndex) => (
              <div className="outline-principle" key={index}>
                <EditableText
                  label={`原则 ${principleIndex + 1}`}
                  required={false}
                  value={principle}
                  onChange={(value) =>
                    onChange(
                      {
                        ...method,
                        principles: method.principles.map((item, i) => (i === index ? value : item)),
                      },
                      'principles',
                    )
                  }
                />
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`删除原则 ${principleIndex + 1}`}
                  onClick={() =>
                    onChange(
                      { ...method, principles: method.principles.filter((_, i) => i !== index) },
                      'principles',
                    )
                  }
                >
                  <Trash2 />
                </Button>
              </div>
            ),
          )
        ) : (
          <p className="empty-method">写清需要坚持的原则和不能做的事情。</p>
        )}
        <Button
          className="add-method-row"
          variant="ghost"
          size="sm"
          disabled={method.principles.length >= 8}
          title={method.principles.length >= 8 ? '一项 SKILL 最多保留八条原则（含结束条件）' : undefined}
          onClick={() => onChange({ ...method, principles: [...method.principles, ''] }, 'principles')}
        >
          <Plus data-icon="inline-start" />
          补充一条原则
        </Button>
      </StepSection>
      <StepSection number={5} title="结束与转交">
        <div className="outline-field">
          <h4>结束条件<span className="required-mark" aria-hidden="true"> *</span></h4>
          <EditableText
            label="结束条件"
            maxLength={500 - boundaryPrefix.length}
            value={boundary}
            placeholder="在什么情况下结束引导或转交教师"
            onChange={(value) =>
              onChange(
                {
                  ...method,
                  principles: [
                    ...method.principles.filter((item) => !item.startsWith(boundaryPrefix)),
                    ...(value.trim() ? [`${boundaryPrefix}${value.trim()}`] : []),
                  ],
                },
                'boundary',
              )
            }
          />
        </div>
      </StepSection>
    </div>
  );
}
