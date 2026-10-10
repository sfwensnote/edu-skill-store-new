import test from 'node:test';
import assert from 'node:assert/strict';
import { marketSkills } from './fixtures/marketplace';
import { skillTrialBindings } from './fixtures/skill-trial-bindings';
import { skillTrialCases } from '../src/data/skill-trial-cases';

test('试用不把同名、自定义或修改过约定的方法当成原方法', () => {
  const source = marketSkills[0].skill;
  assert.ok(skillTrialCases(structuredClone(source), skillTrialBindings).length);
  assert.deepEqual(skillTrialCases({ ...source, id: 'teacher-method' }, skillTrialBindings), []);
  assert.deepEqual(skillTrialCases({ ...source, constraints: ['直接给出完整答案'] }, skillTrialBindings), []);
  assert.deepEqual(skillTrialCases({ ...source, trigger: '学生答对时' }, skillTrialBindings), []);
  assert.deepEqual(skillTrialCases({ ...source, behaviorSteps: ['直接给出完整步骤'] }, skillTrialBindings), []);
});

test('修改明确的条件步骤后不沿用旧案例；标签变化不改写原始内容', () => {
  const source = marketSkills[3].skill;
  const before = structuredClone(source);
  assert.deepEqual(skillTrialCases({ ...source, steps: [{ condition: '任意问题', action: '不再比较费用' }] }, skillTrialBindings), []);
  assert.ok(skillTrialCases({ ...source, tags: ['信息提取'] }, skillTrialBindings).length);
  assert.deepEqual(source, before);
});
