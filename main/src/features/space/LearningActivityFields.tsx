import { useState } from 'react';
import { BookOpen, Check, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/Workbench';
import type { SkillEntry } from '../../../shared/marketplace';
import {
  compatibilityIssue,
  skillPermissionIssue,
  levelNames,
  type LearningActivityDraft,
  type LearningResource,
} from '../../../shared/teaching-activity';

export function SkillMethodSummary({ entry }: { entry: SkillEntry }) {
  return (
    <div className="activity-method-summary">
      <div className="activity-summary-heading">
        <h3>{entry.skill.name}</h3>
        <span>{entry.version}</span>
      </div>
      <p>{entry.skill.description || entry.skill.summary}</p>
      <dl>
        <div>
          <dt>适用范围</dt>
          <dd>
            {entry.grade} · {entry.subject} · {entry.scene}
          </dd>
        </div>
        <div>
          <dt>触发条件</dt>
          <dd>{entry.skill.trigger}</dd>
        </div>
        <div>
          <dt>教学原则</dt>
          <dd>
            {entry.skill.constraints.length
              ? entry.skill.constraints.join('；')
              : '未填写，需回到方法流程补充。'}
          </dd>
        </div>
        <div>
          <dt>方法状态</dt>
          <dd>{entry.validation}</dd>
        </div>
        <div>
          <dt>执行验证</dt>
          <dd>待真实运行验证</dd>
        </div>
      </dl>
    </div>
  );
}

export function LearningActivityFields({
  draft,
  resources,
  entries,
  ownedIds,
  onChange,
  onWorkshop,
  onResourcePreview,
  onSkill,
}: {
  draft: LearningActivityDraft;
  resources: LearningResource[];
  entries: SkillEntry[];
  ownedIds: string[];
  onChange: (draft: LearningActivityDraft) => void;
  onWorkshop: () => void;
  onResourcePreview: () => void;
  onSkill: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const resource = resources.find((r) => r.key === draft.resourceKey);
  const entry = entries.find((e) => e.id === draft.supportSkillId);
  const settings = draft.settings;
  const updateSettings = (patch: Partial<typeof settings>) =>
    onChange({ ...draft, settings: { ...settings, ...patch } });
  if (draft.step === 1)
    return (
      <>
        <h2>选择教学作品</h2>
        <p className="activity-section-intro">仅显示已保存且完成教师确认的作品。</p>
        <div className="activity-resource-tools">
          <label className="activity-search">
            <Search aria-hidden="true" />
            <input
              aria-label="搜索教学作品"
              placeholder="搜索作品名称或知识点"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label className="activity-filter">
            <span>类型</span>
            <select aria-label="教学作品类型" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="all">全部作品</option>
              {([1, 2, 3] as const).map((level) => (
                <option key={level} value={level}>
                  {levelNames[level]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="activity-resource-list">
          {resources
            .filter(
              (r) =>
                (category === 'all' || Number(category) === r.level) &&
                `${r.title}${r.design.knowledgePoint}${r.design.subject}`.includes(query.trim()),
            )
            .map((r) => (
              <button
                className="activity-resource-option"
                aria-pressed={draft.resourceKey === r.key}
                key={r.key}
                onClick={() => {
                  onChange({
                    ...draft,
                    resourceKey: r.key,
                    supportSkillId: '',
                    supportVersion: undefined,
                    settings: {
                      ...settings,
                      title: r.title,
                      submission: r.level === 1 ? 'text' : 'stages',
                      instructions:
                        settings.instructions || '请独立尝试，写清思考过程，并说明你的依据与遇到的困难。',
                    },
                  });
                }}
              >
                <span className="activity-resource-icon">
                  <BookOpen aria-hidden="true" />
                </span>
                <span>
                  <strong>{r.title}</strong>
                  <small>
                    {r.design.grade} · {r.design.subject} · {levelNames[r.level]}
                  </small>
                </span>
                {draft.resourceKey === r.key && <Check aria-label="已选择" />}
              </button>
            ))}
        </div>
        {!resources.length && (
          <EmptyState
            title="还没有可布置的学习作品"
            action={
              <Button variant="outline" onClick={onWorkshop}>
                前往我的 SKILL
              </Button>
            }
          >
            先保存情境题目、任务链或 PBL 项目，并完成教师确认。
          </EmptyState>
        )}
        {!!resources.length &&
          !resources.some(
            (r) =>
              (category === 'all' || Number(category) === r.level) &&
              `${r.title}${r.design.knowledgePoint}${r.design.subject}`.includes(query.trim()),
          ) && <p className="activity-notice">没有找到匹配作品，请调整搜索或类型。</p>}
        {resource && (
          <div className="activity-selection-note">
            <span>已选择：{resource.title}</span>
            <Button variant="link" onClick={onResourcePreview}>
              查看详细设计
            </Button>
          </div>
        )}
        {resource && (
          <p className="activity-help">更换作品会重置名称、提交方式与绑定方法，请检查任务要求。</p>
        )}
      </>
    );
  if (draft.step === 2)
    return (
      <>
        <h2>任务要求</h2>
        <label className="activity-field">
          <span>任务名称</span>
          <input
            aria-label="任务名称"
            maxLength={150}
            value={settings.title}
            onChange={(e) => updateSettings({ title: e.target.value })}
          />
        </label>
        <label className="activity-field">
          <span>任务说明</span>
          <Textarea
            aria-label="任务说明"
            minRows={3}
            maxLength={6000}
            placeholder="学生需要完成什么？有哪些要求或注意事项？"
            value={settings.instructions}
            onChange={(e) => updateSettings({ instructions: e.target.value })}
          />
        </label>
        <fieldset className="activity-fieldset">
          <legend>学习对象</legend>
          <label className="activity-field">
            <span className="sr-only">学习对象方式</span>
            <select
              aria-label="学习对象方式"
              value={settings.audience}
              onChange={(e) => updateSettings({ audience: e.target.value as typeof settings.audience })}
            >
              <option value="controlled">仅教师预览</option>
              <option value="class">指定班级</option>
              <option value="students">指定学生</option>
            </select>
          </label>
          {settings.audience !== 'controlled' && (
            <label className="activity-field">
              <span>{settings.audience === 'class' ? '班级名称' : '学生范围'}</span>
              <input
                aria-label="学习对象"
                placeholder={settings.audience === 'class' ? '填写本次学习的班级' : '填写本次学习的学生范围'}
                maxLength={150}
                value={settings.audienceLabel}
                onChange={(e) => updateSettings({ audienceLabel: e.target.value })}
              />
            </label>
          )}
          <p className="activity-help">仅记录对象范围，尚未开通学生访问。</p>
        </fieldset>
        <div className="activity-field-row">
          <label className="activity-field">
            <span>开始时间（选填）</span>
            <input
              type="datetime-local"
              aria-label="开始时间"
              value={settings.startsAt}
              onChange={(e) => updateSettings({ startsAt: e.target.value })}
            />
          </label>
          <label className="activity-field">
            <span>截止时间（选填）</span>
            <input
              type="datetime-local"
              aria-label="截止时间"
              value={settings.endsAt}
              onChange={(e) => updateSettings({ endsAt: e.target.value })}
            />
          </label>
        </div>
        <fieldset className="activity-fieldset">
          <legend>提交与反馈</legend>
          <div className="activity-field-row">
            <label className="activity-field">
              <span>提交方式</span>
              <select
                aria-label="提交方式"
                value={settings.submission}
                onChange={(e) => updateSettings({ submission: e.target.value as typeof settings.submission })}
              >
                <option value="text">一次填写文字回答</option>
                {resource && resource.level > 1 && <option value="stages">逐项记录任务或阶段</option>}
              </select>
            </label>
            <label className="activity-field">
              <span>反馈时机</span>
              <select
                aria-label="反馈时机"
                value={settings.feedbackTiming}
                onChange={(e) =>
                  updateSettings({ feedbackTiming: e.target.value as typeof settings.feedbackTiming })
                }
              >
                <option value="after-submit">提交后显示教师提示</option>
                <option value="teacher">等待教师反馈</option>
              </select>
            </label>
          </div>
          <label className="activity-check">
            <input
              type="checkbox"
              checked={settings.allowRetry}
              onChange={(e) => updateSettings({ allowRetry: e.target.checked })}
            />
            允许多次尝试
          </label>
          {settings.feedbackTiming === 'after-submit' && (
            <label className="activity-field">
              <span>提交后的教师预设提示</span>
              <Textarea
                aria-label="提交后的教师预设提示"
                minRows={2}
                maxLength={3000}
                value={settings.feedback}
                onChange={(e) => updateSettings({ feedback: e.target.value })}
              />
            </label>
          )}
        </fieldset>
      </>
    );
  if (draft.step === 3)
    return (
      <>
        <h2>教学支持（可选）</h2>
        <p className="activity-section-intro">需要时添加教学 SKILL，也可直接继续。</p>
        <fieldset className="activity-fieldset">
          <legend className="sr-only">是否添加教学 SKILL</legend>
          <label className="activity-check">
            <input
              type="radio"
              name="support-mode"
              checked={!draft.supportSkillId}
              onChange={() => onChange({ ...draft, supportSkillId: '', supportVersion: undefined })}
            />
            不使用教学 SKILL
          </label>
        </fieldset>
        <h3 className="activity-group-title">
          <Sparkles aria-hidden="true" />
          添加已有教学 SKILL
        </h3>
        <div className="activity-resource-list">
          {entries
            .filter((e) => ownedIds.includes(e.id))
            .map((e) => {
              const issue =
                skillPermissionIssue(e, ownedIds) ||
                (resource ? compatibilityIssue(e, resource.design) : '请先选择作品。');
              return (
                <div className="activity-support-option" key={e.id}>
                  <label>
                    <input
                      type="radio"
                      name="support-mode"
                      checked={draft.supportSkillId === e.id && draft.supportVersion === e.version}
                      disabled={!!issue}
                      onChange={() => onChange({ ...draft, supportSkillId: e.id, supportVersion: e.version })}
                    />
                    <span>
                      <strong>{e.skill.name}</strong>
                      <small>
                        {e.version} · {e.grade} · {e.subject}
                      </small>
                      {issue && <small className="activity-warning-text">{issue}</small>}
                    </span>
                  </label>
                  <Button variant="link" onClick={() => onSkill(e.id)}>
                    查看方法
                  </Button>
                </div>
              );
            })}
        </div>
        {!ownedIds.length && <p className="activity-notice">没有可绑定的方法，可继续完成教学任务。</p>}
        {entry && (
          <>
            <SkillMethodSummary entry={entry} />
            <p className="activity-notice">仅保存绑定配置，学生预览不执行 SKILL。</p>
          </>
        )}
      </>
    );
  return (
    <>
      <h2>预览与保存</h2>
      <dl className="activity-review-list">
        <div>
          <dt>学习作品</dt>
          <dd>{resource?.title || '作品已移除'}</dd>
        </div>
        <div>
          <dt>学习对象</dt>
          <dd>{settings.audience === 'controlled' ? '仅教师预览' : settings.audienceLabel}</dd>
        </div>
        <div>
          <dt>时间安排</dt>
          <dd>
            {settings.startsAt.replace('T', ' ') || '未设置开始时间'} 至{' '}
            {settings.endsAt.replace('T', ' ') || '未设置截止时间'}
          </dd>
        </div>
        <div>
          <dt>智能支持</dt>
          <dd>{entry ? `${entry.skill.name} ${entry.version} · 待执行验证` : '不使用教学 SKILL'}</dd>
        </div>
      </dl>
    </>
  );
}
