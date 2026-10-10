import { useState } from 'react';
import { Check, FileCheck, FlaskConical, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/Workbench';
import type { LocalTeachingTask, SkillEntry } from '../../../shared/marketplace';
import {
  compatibilityIssue,
  simulationFingerprint,
  skillPermissionIssue,
  simulateMethodPlan,
  type SkillApplicationDraft,
} from '../../../shared/teaching-activity';
import { SkillMethodSummary } from './LearningActivityFields';

export function SkillApplicationFields({
  draft,
  entries,
  ownedIds,
  tasks,
  onChange,
  onSkill,
  onAdjust,
  onLearning,
}: {
  draft: SkillApplicationDraft;
  entries: SkillEntry[];
  ownedIds: string[];
  tasks: LocalTeachingTask[];
  onChange: (draft: SkillApplicationDraft) => void;
  onSkill: (id: string) => void;
  onAdjust: (entry: SkillEntry) => void;
  onLearning: () => void;
}) {
  const [query, setQuery] = useState('');
  const entry = entries.find((e) => e.id === draft.skillId);
  const targets = tasks.filter((t) => t.kind === 'design' && t.design);
  const target = targets.find((t) => t.id === draft.targetTaskId);
  const validSimulation =
    !!draft.simulation && draft.simulation.fingerprint === simulationFingerprint(draft, entry, target);
  const patch = (update: Partial<SkillApplicationDraft>) =>
    onChange({ ...draft, ...update, simulation: undefined, teacherReviewed: false });
  if (draft.step === 1)
    return (
      <>
        <h2>选择教学 SKILL</h2>
        <label className="activity-search">
          <Search aria-hidden="true" />
          <input
            aria-label="搜索教学 SKILL"
            placeholder="搜索方法名称或适用情境"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="activity-resource-list">
          {entries
            .filter(
              (e) =>
                (ownedIds.includes(e.id) || e.id === draft.skillId) &&
                `${e.skill.name}${e.scene}`.includes(query.trim()),
            )
            .map((e) => (
              <button
                className="activity-resource-option"
                key={e.id}
                aria-pressed={
                  draft.skillId === e.id && (!draft.skillVersion || draft.skillVersion === e.version)
                }
                onClick={() =>
                  patch({
                    skillId: e.id,
                    skillVersion: e.version,
                    targetTaskId: '',
                    scope: '',
                    scenario: '',
                    assessment: 'unknown',
                  })
                }
              >
                <span className="activity-resource-icon">
                  <FileCheck aria-hidden="true" />
                </span>
                <span>
                  <strong>{e.skill.name}</strong>
                  <small>
                    {e.version} · {e.grade} · {e.subject} · {e.validation}
                  </small>
                </span>
                {draft.skillId === e.id && <Check aria-label="已选择" />}
              </button>
            ))}
        </div>
        {!ownedIds.length && !entry && (
          <EmptyState title="还没有可配置的教学 SKILL">
            先在我的作品中创建方法，或将集市方法复用到自己的作品。
          </EmptyState>
        )}
        {entry && (
          <>
            <SkillMethodSummary entry={entry} />
            {skillPermissionIssue(entry, ownedIds) && (
              <p className="activity-notice">{skillPermissionIssue(entry, ownedIds)}</p>
            )}
            <div className="activity-inline-actions">
              <Button variant="outline" onClick={() => onSkill(entry.id)}>
                查看完整方法
              </Button>
              {entry.assistantId && (
                <Button variant="link" onClick={() => onAdjust(entry)}>
                  返回方法确认流程
                </Button>
              )}
            </div>
          </>
        )}
      </>
    );
  if (draft.step === 2)
    return (
      <>
        <h2>用于哪项教学任务</h2>
        <label className="activity-field">
          <span>选择教学任务</span>
          <select
            aria-label="选择教学任务"
            value={draft.targetTaskId}
            onChange={(e) => patch({ targetKind: 'activity', targetTaskId: e.target.value })}
          >
            <option value="">请选择已有教学任务</option>
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
                {t.status === 'draft' ? '（草稿）' : ''}
              </option>
            ))}
          </select>
        </label>
        <details className="activity-help"><summary>其他应用方式</summary><p>教学助手挂载尚未开放。</p></details>
        {!targets.length && (
          <EmptyState
            title="还没有教学任务"
            action={
              <Button variant="outline" onClick={onLearning}>
                先创建教学任务
              </Button>
            }
          >
            先保存一份教学任务。
          </EmptyState>
        )}
        {entry && target?.design && compatibilityIssue(entry, target.design) && (
          <p role="alert" className="activity-notice">
            {compatibilityIssue(entry, target.design)}
          </p>
        )}
        <label className="activity-field">
          <span>允许介入的情境</span>
          <Textarea
            aria-label="允许介入的情境"
            minRows={3}
            maxLength={3000}
            value={draft.scope}
            onChange={(e) => patch({ scope: e.target.value })}
            placeholder="例如：学生第一次答错并说明了自己的解题过程时"
          />
        </label>
        <dl className="activity-review-list">
          <div>
            <dt>运行权限</dt>
            <dd>仅提供教学提示，不代答、不代替学生提交。</dd>
          </div>
          <div>
            <dt>适用对象</dt>
            <dd>
              {target?.activitySettings?.audienceLabel ||
                (target ? '任务要求中的学习对象' : '选择任务后显示')}
            </dd>
          </div>
          <div>
            <dt>方法触发条件</dt>
            <dd>{entry?.skill.trigger || '请先选择方法'}</dd>
          </div>
        </dl>
        <p className="activity-help">不扩大原方法的适用范围；修改做法请返回方法确认流程。</p>
      </>
    );
  if (draft.step === 3)
    return (
      <>
        <h2>检查应用方式</h2>
        <label className="activity-field">
          <span>测试情境</span>
          <Textarea
            aria-label="测试情境"
            minRows={4}
            maxLength={3000}
            value={draft.scenario}
            onChange={(e) => patch({ scenario: e.target.value })}
            placeholder="写出学生的表现、回答，以及你希望方法介入的位置"
          />
        </label>
        <label className="activity-field">
          <span>你对触发条件的判断</span>
          <select
            aria-label="触发条件判断"
            value={draft.assessment}
            onChange={(e) => patch({ assessment: e.target.value as typeof draft.assessment })}
          >
            <option value="unknown">还不能确定</option>
            <option value="trigger">符合原方法触发条件</option>
            <option value="no-trigger">不符合原方法触发条件</option>
          </select>
        </label>
        <Button
          disabled={!entry || !draft.scenario.trim()}
          onClick={() =>
            entry &&
            onChange({
              ...draft,
              simulation: simulateMethodPlan(draft, entry, target),
              teacherReviewed: false,
            })
          }
        >
          <FlaskConical aria-hidden="true" data-icon="inline-start" />
          查看模拟步骤
        </Button>
        <div className="activity-capability-note">
          <p>按教师判断展示教学步骤，未实际执行。</p>
        </div>
        {validSimulation && (
          <p role="status" className="activity-save-note">
            模拟计划已更新
          </p>
        )}
      </>
    );
  return (
    <>
      <h2>确认应用配置</h2>
      <dl className="activity-review-list">
        <div>
          <dt>教学方法</dt>
          <dd>
            {entry?.skill.name} · {entry?.version}
          </dd>
        </div>
        <div>
          <dt>应用位置</dt>
          <dd>{target?.title || '教学任务已移除'}</dd>
        </div>
        <div>
          <dt>运行范围</dt>
          <dd>{draft.scope}</dd>
        </div>
        <div>
          <dt>教师方法核对</dt>
          <dd>{entry?.validation || '待确认'}</dd>
        </div>
        <div>
          <dt>配置检查</dt>
          <dd>{validSimulation ? '已有规则模拟，尚无执行证据' : '配置已变化，需要重新模拟'}</dd>
        </div>
      </dl>
      <label className="activity-check">
        <input
          type="checkbox"
          checked={draft.teacherReviewed}
          disabled={!validSimulation}
          onChange={(e) => onChange({ ...draft, teacherReviewed: e.target.checked })}
        />
        我已检查本次模拟计划与原方法的对应关系
      </label>
      {entry && skillPermissionIssue(entry, ownedIds) && (
        <p className="activity-notice">{skillPermissionIssue(entry, ownedIds)}</p>
      )}
    </>
  );
}
