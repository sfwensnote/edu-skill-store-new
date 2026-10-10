import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { IdeaForm } from '@/features/designer/IdeaForm';
import { GuidedMethodPage } from '@/features/designer/GuidedMethodPage';
import { prepareMethod, type CreationDraft } from '../../../shared/teaching-method';
import { formSkill, type SkillRecord } from '../../../shared/skill-workspace';
import '@/features/designer/creation-flow.css';

const tagSuggestions = ['自主纠错', '思路追问', '证据追问', '阅读理解', '分层提示'];

export function SkillEditor({ record, save, dirty, onFormed }: {
  record: SkillRecord; save: (record: SkillRecord, preserveInput?: boolean) => boolean;
  dirty: boolean; onFormed: () => void;
}) {
  const [error, setError] = useState('');
  const draft = record.draft;
  function update(next: CreationDraft) {
    setError('');
    save({ ...record, draft: next, updatedAt: new Date().toISOString() }, true);
  }
  function confirm() {
    try {
      const next = formSkill(record, new Date().toISOString());
      if (save(next)) onFormed();
    } catch (cause) { setError(cause instanceof Error ? cause.message : '请检查 SKILL 内容。'); }
  }
  return <div className="creation-flow sd-editor">
    <div className="sd-page-heading">
      <div><h1>{record.content ? '修订 SKILL' : '创建 SKILL'}</h1>
        <p>{draft.stage === 'idea' ? '从一个真实的课堂片段开始。' : '直接编辑方法，或借助左侧问题逐步梳理。'}</p></div>
      <span className="sd-meta">{dirty ? '当前输入尚未保存' : '草稿已存于本机'}</span>
    </div>
    {draft.stage === 'idea' ? <IdeaForm draft={draft} onChange={update} tagSuggestions={tagSuggestions} onContinue={() => {
      update({ ...draft, stage: 'method', method: prepareMethod(draft.originalIdea, draft.method) });
    }} /> : <>
      <section className="sd-context-editor" aria-label="使用条件">
        <h2>使用条件</h2>
        <div>
          <div className="sd-context-field"><label htmlFor="skill-inputs">使用前需要哪些信息？</label>
            <Textarea id="skill-inputs" maxLength={1000} placeholder="例如：题目、学生作答、此前的提示记录"
              value={record.context.inputs} onChange={(event) => save({ ...record,
                context: { ...record.context, inputs: event.target.value }, updatedAt: new Date().toISOString() }, true)} />
          </div>
          <div className="sd-context-field"><label htmlFor="skill-exclusions">什么时候不适用，或需要教师介入？</label>
            <Textarea id="skill-exclusions" maxLength={1000} placeholder="例如：缺少核对依据时先澄清，现场操作由教师判断"
              value={record.context.exclusions} onChange={(event) => save({ ...record,
                context: { ...record.context, exclusions: event.target.value }, updatedAt: new Date().toISOString() }, true)} />
          </div>
        </div>
      </section>
      {record.content && <p className="sd-edit-note">正在编辑 v{record.revision} 的草稿。形成新版本后，重新核对修改后的方法。</p>}
      <GuidedMethodPage draft={draft} onChange={update} requireAllAnswers={false} tagSuggestions={tagSuggestions}
        onEditIdea={() => update({ ...draft, stage: 'idea' })} onConfirm={confirm} saveFailed={dirty} />
    </>}
    {error && <p role="alert" className="sd-error">{error}</p>}
    <footer className="sd-editor-footer">
      <Button variant="ghost" asChild><a href="#/skills">回到我的 SKILL</a></Button>
      {draft.stage !== 'idea' && <span>问答只是梳理工具，填写完整的方法可直接形成 SKILL。</span>}
    </footer>
  </div>;
}
