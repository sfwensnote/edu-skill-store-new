import { TextField } from './DesignFields';
import { TeachingCategoryField, TeachingTagsField } from '@/components/TeachingTagsField';
import { contextTypes, type ContextualDesign } from '../../../shared/contextual-design';
export function InquiryBrief({
  design,
  onChange,
}: {
  design: ContextualDesign;
  onChange: (patch: Partial<ContextualDesign>) => void;
}) {
  return (
    <div className="inquiry-brief">
      <div className="field-grid">
        <label className="form-field">
          从什么开始
          <select
            aria-label="教学内容类型"
            value={design.sourceType || 'question'}
            onChange={(e) =>
              onChange({
                sourceType: e.target.value as ContextualDesign['sourceType'],
              })
            }
          >
            <option value="question">一道题 / 教材材料</option>
            <option value="knowledge">知识点 / 课题</option>
            <option value="problem">实际问题 / 探究想法</option>
          </select>
        </label>
        <TextField label="设计名称" value={design.title} onChange={(title) => onChange({ title })} short />
      </div>
      <TextField
        label="教学内容"
        value={design.originalProblem}
        onChange={(originalProblem) => onChange({ originalProblem })}
        rows={4}
        hint="粘贴原题，或描述课题与实际问题。"
      />
      <div className="field-grid">
        <label className="form-field">
          学段
          <select
            aria-label="学段"
            value={design.grade}
            onChange={(e) => onChange({ grade: e.target.value })}
          >
            {['小学', '初中', '高中', '其他'].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <TextField label="年级（可选）" value={design.year} onChange={(year) => onChange({ year })} short />
        <TextField label="学科" value={design.subject} onChange={(subject) => onChange({ subject })} short />
        <TextField
          label="知识点（可选）"
          value={design.knowledgePoint}
          onChange={(knowledgePoint) => onChange({ knowledgePoint })}
          short
        />
      </div>
      <TextField
        label="学生学习目标"
        value={design.learningGoal}
        onChange={(learningGoal) => onChange({ learningGoal })}
        hint="例如：用调查证据解释校园植物分布。"
      />
      <TeachingCategoryField value={design.category || (design.category === undefined ? design.currentLevel === 3 ? '项目式学习' : '情境任务' : null)} onChange={(category) => onChange({ category })} />
      <TeachingTagsField value={design.tags} onChange={(tags) => onChange({ tags })} />
      <details>
        <summary>补充情境与实施安排（可选）</summary>
        <div className="field-grid">
          <label className="form-field">
            情境方向
            <select
              aria-label="情境方向"
              value={design.contextType}
              onChange={(e) => onChange({ contextType: e.target.value })}
            >
              {contextTypes.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <TextField
            label="可用时间"
            value={design.timeAvailable || ''}
            onChange={(timeAvailable) => onChange({ timeAvailable })}
            short
          />
        </div>
        <TextField
          label="情境与资源补充"
          value={design.customContext}
          onChange={(customContext) => onChange({ customContext })}
          hint="学生熟悉的场景、可用材料、场地或其他限制。"
        />
      </details>
    </div>
  );
}
