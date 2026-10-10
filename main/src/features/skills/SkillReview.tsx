import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MethodSteps } from '@/features/usage/MethodSteps';
import { packageTeachingMethod } from '../../../shared/teaching-method';
import { confirmSkillReview, hasSkillChanges, skillCheckItems, type SkillRecord } from '../../../shared/skill-workspace';

export function SkillReview({ record, save, onReviewed }: {
  record: SkillRecord; save: (record: SkillRecord, preserveInput?: boolean) => boolean; onReviewed: () => void;
}) {
  const [error, setError] = useState('');
  if (!record.content) return null;
  const content = record.content;
  const items = skillCheckItems(record);
  const checked = record.checks?.revision === record.revision ? record.checks.items : [];
  const ready = items.every((item) => checked.includes(item.id)) && !hasSkillChanges(record);
  return <>
    <div className="sd-page-heading"><div><h1>核对教学方法</h1><p>逐项判断 v{record.revision} 是否准确表达了你的经验。</p></div></div>
    {hasSkillChanges(record) && <p className="sd-error">草稿有修改，请先回到整理页形成新版本，再核对。</p>}
    <div className="sd-review-layout">
      <article className="sd-document">
        <header><h2>{content.method.name}</h2><p>{content.method.problem}</p></header>
        <dl className="sd-context"><div><dt>使用前需要</dt><dd>{content.context.inputs}</dd></div>
          <div><dt>不适用与教师介入</dt><dd>{content.context.exclusions}</dd></div></dl>
        <MethodSteps skill={packageTeachingMethod(content.method, record.id)} />
      </article>
      <aside className="sd-checklist" aria-label="教师核对清单">
        <h2>这符合你的教学意图吗？</h2>
        <fieldset><legend className="sr-only">当前版本核对项</legend>
          {items.map((item) => <label key={item.id}>
            <input type="checkbox" checked={checked.includes(item.id)} disabled={hasSkillChanges(record)}
              onChange={(event) => {
                setError('');
                save({ ...record, checks: { revision: record.revision,
                  items: event.target.checked ? [...checked, item.id] : checked.filter((id) => id !== item.id) },
                  review: undefined, detection: undefined, publication: undefined, updatedAt: new Date().toISOString() }, true);
              }} /><span>{item.label}</span>
          </label>)}
        </fieldset>
        <p>{checked.length} / {items.length} 项已核对</p>
        <Button disabled={!ready} onClick={() => {
          try { if (save(confirmSkillReview(record, new Date().toISOString()))) onReviewed(); }
          catch (cause) { setError(cause instanceof Error ? cause.message : '请重新核对。'); }
        }}>确认此版本，进入 LLM 检测</Button>
        <Button variant="outline" asChild><a href={`#/skills/${encodeURIComponent(record.id)}/edit`}>返回修改方法</a></Button>
        <small>教师核对确认教学意图；下一步由检测模型检查情境中的回答。</small>
        {error && <p role="alert" className="sd-error">{error}</p>}
      </aside>
    </div>
  </>;
}
