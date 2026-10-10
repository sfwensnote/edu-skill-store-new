import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { demoIdea, type CreationDraft } from '../../../shared/teaching-method';
import { MethodTextField } from './MethodTextField';
import { TeachingCategoryField, TeachingTagsField } from '@/components/TeachingTagsField';
import { isTeachingCategory, visibleTeachingTags } from '../../../shared/teaching-tags';

export function IdeaForm({
  draft,
  onChange,
  onContinue,
}: {
  draft: CreationDraft;
  onChange: (draft: CreationDraft) => void;
  onContinue: () => void;
}) {
  const complete = !!draft.originalIdea.trim() && !!draft.grade.trim() && !!draft.subject.trim()
    && isTeachingCategory(draft.method.category) && visibleTeachingTags(draft.method.tags).length > 0;
  return (
    <form
      className="idea-form creation-panel"
      onSubmit={(event) => {
        event.preventDefault();
        if (complete) onContinue();
      }}
    >
      <header>
        <h2>说说你的教学想法</h2>
      </header>
      {!draft.originalIdea && (
        <Button
          variant="link"
          type="button"
          onClick={() =>
            onChange({
              ...draft,
              originalIdea: demoIdea,
              exampleIdea: true,
              grade: '初中',
              subject: '数学',
              teachingScene: '错因辅导',
              method: { ...draft.method, category: '错因辅导', tags: ['一元一次方程'] },
            })
          }
        >
          填入数学案例
        </Button>
      )}
      <label className="idea-input">
        <span className="sr-only">教学想法</span>
        <MethodTextField
          id="original-idea"
          aria-label="教学想法"
          required
          maxLength={500}
          value={draft.originalIdea}
          onFocus={() => {
            if (draft.exampleIdea && draft.originalIdea === demoIdea)
              onChange({ ...draft, originalIdea: '', exampleIdea: false });
          }}
          onChange={(event) => onChange({ ...draft, originalIdea: event.target.value, exampleIdea: false })}
          placeholder="例如：学生做错题以后总是等答案。我希望第一次做错的时候不要马上告诉他答案，而是先让他回顾自己的思路。"
        />
        {draft.originalIdea.length >= 450 && (
          <span className="idea-count">还可输入 {500 - draft.originalIdea.length} 字</span>
        )}
      </label>
      <div className="idea-context">
        <label>
          <span>学段<span className="required-mark" aria-hidden="true"> *</span></span>
          <select required value={draft.grade} onChange={(event) => onChange({ ...draft, grade: event.target.value })}>
            {['小学', '初中', '高中', '大学'].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          <span>学科<span className="required-mark" aria-hidden="true"> *</span></span>
          <select
            required
            value={draft.subject}
            onChange={(event) => onChange({ ...draft, subject: event.target.value })}
          >
            {[
              ...new Set([
                '语文',
                '数学',
                '英语',
                '物理',
                '化学',
                '生物',
                '历史',
                '地理',
                '科学',
                '信息技术',
                '其他',
                '任意学科',
                draft.subject,
              ]),
            ].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <TeachingCategoryField value={draft.method.category}
          onChange={(category) => onChange({ ...draft, teachingScene: category || '', method: { ...draft.method, category } })} />
      </div>
      <TeachingTagsField required value={draft.method.tags}
        onChange={(tags) => onChange({ ...draft, method: { ...draft.method, tags } })} />
      <footer className="creation-footer">
        <Button size="lg" type="submit" disabled={!complete}>
          继续
          <ArrowRight data-icon="inline-end" />
        </Button>
      </footer>
    </form>
  );
}
