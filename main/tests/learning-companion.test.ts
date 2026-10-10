import test from 'node:test';
import assert from 'node:assert/strict';
import { newCompanion, companionIssue, companionContext, readCompanions, companionsKey } from '../shared/learning-companion';
import { assistantSkillEntries } from '../shared/marketplace';
import { initialMine } from '../src/data/platform';
import { accountWorkspace } from '../src/lib/account-workspace';

const skills = assistantSkillEntries(initialMine);
test('学伴选择只引用个人 SKILL，任务字段与选配设计分别校验', () => {
  const original = JSON.stringify(skills);
  const value = newCompanion('buddy', skills[0].id);
  value.name = '数学学伴';
  assert.equal(companionIssue(value, skills), '');
  assert.match(companionIssue(value, skills, true), /教学任务名称/);
  for (const key of Object.keys(value.task) as (keyof typeof value.task)[]) value.task[key] = '教师填写';
  assert.equal(companionIssue(value, skills, true), '');
  value.design.contextual = true;
  assert.match(companionIssue(value, skills, true), /教学情景/);
  value.design.context = '学校用水'; value.design.question = '如何减少浪费？';
  value.design.pbl = true;
  assert.match(companionIssue(value, skills, true), /PBL/);
  value.design.drivingQuestion = '如何节水？'; value.design.product = '改进方案'; value.design.stages = '调查\n设计\n展示';
  assert.equal(companionIssue(value, skills, true), '');
  assert.match(companionIssue(value, [], true), /已移除/);
  assert.equal(JSON.stringify(skills), original);
});
test('任务上下文包含教师方法、任务和实际文本材料，不编造附件解析结果', () => {
  const value = newCompanion('buddy', skills[0].id); value.name = '科学学伴'; value.task.goals = '用证据解释结论';
  value.materials = [{ id: 'm', name: '调查.txt', type: 'text/plain', size: 12, data: '', text: '真实调查记录' },
    { id: 'p', name: '教材.pdf', type: 'application/pdf', size: 12, data: '', text: '' }];
  const context = companionContext(value, skills);
  assert.ok(context.includes(skills[0].skill.name)); assert.match(context, /用证据解释结论/);
  assert.match(context, /真实调查记录/); assert.match(context, /教材.pdf（附件）/);
  assert.deepEqual(readCompanions(JSON.stringify([value])), [value]);
  assert.throws(() => readCompanions('{bad')); assert.throws(() => readCompanions('[{}]'));
});
test('学伴保存遵守账号隔离，不写入 SKILL 存储', () => {
  const data = new Map<string, string>();
  const storage = { get length() { return data.size; }, key: (i: number) => [...data.keys()][i] ?? null,
    getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, removeItem: (key: string) => { data.delete(key); } };
  const teacher = accountWorkspace(storage, 'teacher-a'), other = accountWorkspace(storage, 'teacher-b');
  teacher.setItem(companionsKey, JSON.stringify([newCompanion('buddy')]));
  assert.equal(other.getItem(companionsKey), null);
  assert.equal(teacher.length, 1); assert.equal(teacher.key(0), companionsKey);
  assert.equal([...data.keys()].some(key => key.includes('frontend-demo')), false);
});
