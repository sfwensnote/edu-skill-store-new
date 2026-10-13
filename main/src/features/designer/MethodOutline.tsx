import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StepSection } from '@/components/Workbench';
import { boundaryPrefix, type TeachingMethod } from '../../../shared/teaching-method';
import { MethodTextField } from './MethodTextField';

export function MethodOutline({ method, onChange }: {
  method: TeachingMethod; onChange: (method: TeachingMethod, field?: string) => void;
}) {
  const boundary = method.principles.find(item => item.startsWith(boundaryPrefix))?.slice(boundaryPrefix.length) || '';
  const steps = method.teachingSteps.length ? method.teachingSteps : [{ condition: '', action: '' }];
  const field = (label: string, key: 'problem' | 'expectedOutcome' | 'trigger', placeholder: string) => <label className="direct-field">
    {label}<span className="required-mark" aria-hidden="true"> *</span>
    <MethodTextField id={`direct-${key}`} aria-label={label} required value={method[key]} minRows={2} maxLength={800} placeholder={placeholder}
      onChange={event => onChange({ ...method, [key]: event.target.value }, key)} />
  </label>;
  return <div className="method-sections direct-method-sections">
    <StepSection number={1} title="教学目标框架">
      {field('想解决的问题', 'problem', '你想解决什么教学问题？')}
      {field('希望学生达到', 'expectedOutcome', '使用这个方法后，希望学生学会什么？')}
      {field('什么时候开始', 'trigger', '在什么情况下开始使用这个教学方法？')}
    </StepSection>
    <StepSection number={2} title="我会怎么做">
      <p className="direct-section-hint">按顺序写下你的教学做法。步骤 1 必填，后续步骤可以按需要添加。</p>
      <ol className="direct-steps">{steps.map((step, index) => <li key={index}>
        <div className="direct-step-heading"><label htmlFor={`direct-step-${index}`}>步骤 {index + 1}{index === 0 ? <span className="required-mark" aria-hidden="true"> *</span> : <small>（选填）</small>}</label>
          {index > 0 && <Button type="button" size="icon-xs" variant="ghost" aria-label={`删除步骤 ${index + 1}`} onClick={() => onChange({ ...method, teachingSteps: steps.filter((_, position) => position !== index) })}><Trash2 /></Button>}
        </div>
        <MethodTextField id={`direct-step-${index}`} aria-label={`步骤 ${index + 1}`} required={index === 0} value={step.action} minRows={3} maxLength={500} placeholder={index === 0 ? '写下你首先会怎么做' : '写下接下来会怎么做（可不填）'}
          onChange={event => onChange({ ...method, teachingSteps: steps.map((item, position) => position === index ? { ...item, action: event.target.value } : item) }, `step-${index}-action`)} />
      </li>)}</ol>
      <Button variant="outline" type="button" disabled={steps.length >= 8} onClick={() => onChange({ ...method, teachingSteps: [...steps, { condition: '', action: '' }] })}><Plus />添加步骤</Button>
      {steps.length >= 8 && <p className="subtle">最多保留 8 个步骤，可修改或合并已有步骤。</p>}
    </StepSection>
    <StepSection number={3} title="我的原则（选填）">
      <p className="direct-section-hint">写清需要坚持的原则和不能做的事情。</p>
      {method.principles.map((value, index) => ({ value, index })).filter(item => !item.value.startsWith(boundaryPrefix)).map((item, position) => <div className="direct-principle" key={item.index}>
        <MethodTextField id={`direct-principle-${item.index}`} aria-label={`原则 ${position + 1}`} value={item.value} maxLength={500} placeholder="填写一条教学原则（选填）"
          onChange={event => onChange({ ...method, principles: method.principles.map((value, index) => index === item.index ? event.target.value : value) }, 'principles')} />
        <Button type="button" variant="ghost" size="icon-xs" aria-label={`删除原则 ${position + 1}`} onClick={() => onChange({ ...method, principles: method.principles.filter((_, index) => index !== item.index) }, 'principles')}><Trash2 /></Button>
      </div>)}
      <Button variant="outline" type="button" disabled={method.principles.filter(item => !item.startsWith(boundaryPrefix)).length >= 7} onClick={() => onChange({ ...method, principles: [...method.principles, ''] }, 'principles')}><Plus />添加原则</Button>
    </StepSection>
    <StepSection number={4} title="结束与转交"><label className="direct-field">结束条件<span className="required-mark" aria-hidden="true"> *</span>
      <MethodTextField id="direct-boundary" aria-label="结束条件" required value={boundary} maxLength={500 - boundaryPrefix.length} minRows={2} placeholder="在什么情况下结束引导或转交教师"
        onChange={event => onChange({ ...method, principles: [...method.principles.filter(item => !item.startsWith(boundaryPrefix)), `${boundaryPrefix}${event.target.value}`] }, 'boundary')} />
    </label></StepSection>
  </div>;
}
