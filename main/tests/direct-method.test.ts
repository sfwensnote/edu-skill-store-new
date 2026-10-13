import { test } from 'node:test';
import assert from 'node:assert/strict';
import { directCreationDraft, directDraftError, prepareDirectMethod } from '../shared/direct-method';
import { completeTeachingMethod } from './fixtures/teaching-method';
import { packageTeachingMethod } from '../shared/teaching-method';

test('直接创建不预填教学内容；步骤一必填，空白选填步骤不进入封装', () => {
  const draft = directCreationDraft();
  assert.equal(draft.stage, 'method'); assert.equal(draft.originalIdea, ''); assert.equal(draft.method.problem, '');
  assert.equal(draft.method.teachingSteps.length, 1);
  draft.grade = '高中'; draft.subject = '数学';
  draft.method = completeTeachingMethod({ teachingSteps: [{ condition: '', action: '' }] });
  assert.match(directDraftError(draft), /步骤 1/);
  draft.method.teachingSteps = [{ condition: '', action: '请学生说明自己的思路' }, { condition: '', action: '' }, { condition: '', action: '让学生独立检查' }];
  assert.equal(directDraftError(draft), '');
  const packaged = packageTeachingMethod(prepareDirectMethod(draft.method), 'direct');
  assert.deepEqual(packaged.behaviorSteps, ['请学生说明自己的思路', '让学生独立检查']);
  assert.equal(packaged.steps?.[0].condition, draft.method.trigger);
  assert.equal(packaged.steps?.[1].condition, '完成上一步后，继续步骤 2');
  assert.equal(draft.method.teachingSteps.length, 3);
});

test('旧方法的条件和内容原样保留，基础信息仍有完整校验', () => {
  const draft = { ...directCreationDraft(), grade: '初中', subject: '数学', method: completeTeachingMethod() };
  assert.deepEqual(prepareDirectMethod(draft.method), draft.method);
  assert.match(directDraftError({ ...draft, grade: '' }), /学段/);
  assert.match(directDraftError({ ...draft, subject: '' }), /学科/);
  assert.match(directDraftError({ ...draft, method: { ...draft.method, name: '' } }), /名称/);
});
