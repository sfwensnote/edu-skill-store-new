import test from 'node:test';
import assert from 'node:assert/strict';
import { initialMine } from '../src/data/platform';
import { methodFromSkill, defaultCreationDraft, prepareMethod, demoIdea, mockQuestions, recordAnswer } from '../shared/teaching-method';
import { reviseReviewedMethod, isMethodReviewed } from '../shared/method-review';
import { methodPreviewCases } from '../shared/method-preview';
import { readRoute, routeHash } from '../src/lib/routes';

test('空或不完整的方法不能以旧状态冒充已核对', () => {
  const reviewed = { ...initialMine[0], revision: 2, status: 'TESTED' as const };
  assert.equal(isMethodReviewed(reviewed), true);
  assert.equal(isMethodReviewed({ ...reviewed, skills: [] }), false);
  assert.equal(isMethodReviewed({ ...reviewed, skills: [{ ...reviewed.skills[0], behaviorSteps: [] }] }), false);
});

test('核对中修改方法只替换目标 SKILL，升级版本并撤销旧确认', () => {
  const assistant = { ...structuredClone(initialMine[0]), revision: 4, isPublic: true };
  const skill = assistant.skills[0];
  const method = { ...methodFromSkill(skill), teachingSteps: [{ condition: '回顾后仍未发现问题', action: '提醒检查具体步骤' }] };
  const next = reviseReviewedMethod(assistant, skill.id, method);
  assert.equal(next.revision, 5);
  assert.equal(next.status, 'GENERATED');
  assert.equal(next.isPublic, false);
  assert.equal(isMethodReviewed(next), false);
  assert.equal(next.skills[0].steps![0].action, '提醒检查具体步骤');
  assert.deepEqual(next.skills[1], assistant.skills[1]);
  assert.equal(assistant.revision, 4);
  assert.equal(assistant.skills[0].steps, undefined);
  assert.throws(() => reviseReviewedMethod(assistant, skill.id, { ...method, category: null }), /教学分类/);
});

test('第二次介入的示例进入独立预览情况，不被第一步替代', () => {
  let draft = defaultCreationDraft();
  draft.method = prepareMethod(demoIdea, draft.method);
  for (const question of mockQuestions) draft = recordAnswer(draft, question.example);
  const assistant = { ...initialMine[0], skills: [initialMine[0].skills[0]] };
  const updated = reviseReviewedMethod(assistant, assistant.skills[0].id, draft.method);
  const cases = methodPreviewCases(updated.skills);
  assert.equal(cases.length, 2);
  assert.equal(cases[1].condition, mockQuestions[3].example);
  assert.equal(cases[1].action, mockQuestions[4].example);
  assert.notEqual(cases[1].action, mockQuestions[2].example);
});

test('预览保留核对或方法步骤来源及指定步骤，刷新后仍可返回', () => {
  for (const from of ['test', 'method', 'report', 'logs'] as const) {
    const route = { page: 'trial-preview' as const, assistantId: 'review', from, caseId: 'skill:1', returnTo: '#/assistant/review/test' };
    assert.deepEqual(readRoute(routeHash(route)), route);
  }
});
