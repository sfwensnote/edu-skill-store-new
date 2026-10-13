import { TeachingCategoryField, TeachingTagsField } from '@/components/TeachingTagsField';
import { SkillIconField } from '@/components/SkillIconField';
import type { CreationDraft } from '../../../shared/teaching-method';
import { MethodTextField } from './MethodTextField';

export function MethodBasicInfo({ draft, onChange, onIconBusy }: {
  draft: CreationDraft; onChange: (value: CreationDraft) => void; onIconBusy: (busy: boolean) => void;
}) {
  return <section className="creation-panel direct-basic-info" aria-label="基础信息">
    <header><h2>基础信息</h2><p>填写名称与适用范围，方便分享和复用。</p></header>
    <label className="direct-field">教学方法名称<span className="required-mark" aria-hidden="true"> *</span>
      <input aria-label="教学方法名称" required maxLength={80} value={draft.method.name || ''} placeholder="为你的教学方法起一个名字"
        onChange={event => onChange({ ...draft, method: { ...draft.method, name: event.target.value } })} />
    </label>
    <label className="direct-field">教学方法简介<span className="required-mark" aria-hidden="true"> *</span>
      <MethodTextField id="direct-description" aria-label="教学方法简介" required minRows={3} maxLength={800} value={draft.method.description || ''} placeholder="用一句话说明这个方法的用途"
        onChange={event => onChange({ ...draft, method: { ...draft.method, description: event.target.value } })} />
    </label>
    <div className="direct-scope">
      <label className="direct-field">学段<span className="required-mark" aria-hidden="true"> *</span><select aria-label="学段" required value={draft.grade} onChange={event => onChange({ ...draft, grade: event.target.value })}>
        <option value="">请选择学段</option>{[...new Set(['小学', '初中', '高中', '大学', draft.grade].filter(Boolean))].map(item => <option key={item}>{item}</option>)}
      </select></label>
      <label className="direct-field">学科<span className="required-mark" aria-hidden="true"> *</span><select aria-label="学科" required value={draft.subject} onChange={event => onChange({ ...draft, subject: event.target.value })}>
        <option value="">请选择学科</option>{[...new Set(['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '科学', '信息技术', '其他', '任意学科', draft.subject].filter(Boolean))].map(item => <option key={item}>{item}</option>)}
      </select></label>
    </div>
    <TeachingCategoryField value={draft.method.category} onChange={category => onChange({ ...draft, teachingScene: category || '', method: { ...draft.method, category } })} />
    <TeachingTagsField required value={draft.method.tags} onChange={tags => onChange({ ...draft, method: { ...draft.method, tags } })} />
    <SkillIconField category={draft.method.category} value={draft.method.icon} onBusy={onIconBusy} onChange={icon => onChange({ ...draft, method: { ...draft.method, icon } })} />
  </section>;
}
