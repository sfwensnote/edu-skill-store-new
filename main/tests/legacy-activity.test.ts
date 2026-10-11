import test from 'node:test';
import assert from 'node:assert/strict';
import { isActivityDraft, type TeachingActivityDraft } from '../shared/legacy-activity';
import { parseMarketWorkspace } from '../shared/marketplace';
import { legacyActivityDraft } from './fixtures/legacy-activity';

test('旧活动资料仍可读取，损坏字段和模拟证据不进入工作区', () => {
  const learning = legacyActivityDraft('legacy-learning');
  const skill: TeachingActivityDraft = {
    id: 'legacy-skill', step: 3, updatedAt: learning.updatedAt, path: 'skill', skillId: 'method',
    targetKind: 'activity', targetTaskId: 'task', scope: '学生需要帮助时', scenario: '课堂学习',
    assessment: 'unknown', teacherReviewed: false,
  };
  assert.equal(isActivityDraft(learning), true);
  assert.equal(isActivityDraft(skill), true);
  for (const damaged of [null, {}, { ...learning, settings: {} }, { ...learning, step: 9 },
    { ...skill, targetKind: 'invalid' }, { ...skill, simulation: { fingerprint: 'fake', plannedSteps: [] } }])
    assert.equal(isActivityDraft(damaged), false);
  const stored = parseMarketWorkspace(JSON.stringify({ version: 1, activityDrafts: [learning, skill, { id: 'broken' }] }));
  assert.deepEqual(stored.activityDrafts, [learning, skill]);
});

test('旧活动设置与模拟记录保持原值，解析不创建方法或新的任务', () => {
  const learning = legacyActivityDraft('legacy-learning');
  learning.settings.title = '原活动名称';
  learning.settings.instructions = '保留教师填写的要求';
  const skill: TeachingActivityDraft = {
    id: 'legacy-skill', step: 3, updatedAt: learning.updatedAt, path: 'skill', skillId: 'method',
    skillVersion: 'v2.0', targetKind: 'activity', targetTaskId: 'task', scope: '学生答错时',
    scenario: '原有情境', assessment: 'trigger', teacherReviewed: true,
    simulation: { createdAt: learning.updatedAt, fingerprint: '原有记录', assessment: 'trigger',
      scenario: '原有情境', plannedSteps: ['询问学生思路'] },
  };
  const source = { version: 1, activityDrafts: [learning, skill] };
  const before = structuredClone(source);
  const stored = parseMarketWorkspace(JSON.stringify(source));
  assert.deepEqual(stored.activityDrafts, source.activityDrafts);
  assert.deepEqual(stored.tasks, []); assert.deepEqual(stored.addedSkills, []);
  assert.deepEqual(source, before);
});
