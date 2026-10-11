import test from 'node:test';
import assert from 'node:assert/strict';
import { marketSkills } from './fixtures/marketplace';
import { skillTrialBindings } from './fixtures/skill-trial-bindings';
import { skillTrialCases } from '../src/data/skill-trial-cases';
import { packageTeachingMethod } from '../shared/teaching-method';
import { completeTeachingMethod } from './fixtures/teaching-method';

test('新建 SKILL 按自己的条件和做法提供案例，不套用同名原案例', () => {
  const source = marketSkills[0].skill;
  assert.ok(skillTrialCases(structuredClone(source), skillTrialBindings).length);
  const own = skillTrialCases({ ...source, id: 'teacher-method' }, skillTrialBindings);
  assert.ok(own.length); assert.ok(own.every(item => item.id.startsWith('generated:teacher-method:')));
  assert.notDeepEqual(own, skillTrialCases(source, skillTrialBindings));
  const revised = skillTrialCases({ ...source, constraints: ['直接给出完整答案'] }, skillTrialBindings);
  assert.ok(revised.every(item => item.id.startsWith('generated:')));
  assert.notDeepEqual(revised, skillTrialCases(source, skillTrialBindings));
});

test('修改条件步骤后更新案例，不沿用旧题目；标签变化不改写原始内容', () => {
  const source = marketSkills[3].skill;
  const before = structuredClone(source);
  const cases = skillTrialCases({ ...source, steps: [{ condition: '学生不确定', action: '请学生检查自己的思路' }] }, skillTrialBindings);
  assert.equal(cases.length, 1); assert.equal(cases[0].material, '学生不确定');
  assert.match(cases[0].start.reply, /不确定的一步/);
  assert.ok(skillTrialCases({ ...source, tags: ['信息提取'] }, skillTrialBindings).length);
  assert.deepEqual(source, before);
});

test('自建方法案例呈现挂载回复与后续提示，未填写方法时不编造内容', () => {
  const skill = packageTeachingMethod(completeTeachingMethod({ teachingSteps: [
    { condition: '学生第一次答错', action: '询问：“你是怎么想的？”' },
    { condition: '学生仍找不到问题', action: '提醒学生检查不确定的一步' },
  ] }), 'own-method');
  const before = structuredClone(skill);
  const cases = skillTrialCases(skill);
  assert.equal(cases.length, 2); assert.equal(cases[0].start.reply, '你是怎么想的？');
  assert.match(cases[0].start.choices![0].reply, /检查/);
  assert.deepEqual(skill, before);
  assert.deepEqual(skillTrialCases({ ...skill, steps: [], behaviorSteps: [] }), []);
});
