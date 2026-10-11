import test from 'node:test';
import assert from 'node:assert/strict';
import { newCompanion, companionIssue, companionContext, readCompanions, companionsKey } from '../shared/learning-companion';
import { assistantSkillEntries } from '../shared/marketplace';
import { initialMine } from '../src/data/platform';
import { accountWorkspace } from '../src/lib/account-workspace';

const skills = assistantSkillEntries(initialMine);
test('四步学伴只引用个人 SKILL，教学场景三项与选配设计分别校验', () => {
  const original = JSON.stringify(skills);
  const value = newCompanion('buddy', skills[0].id);
  value.name = '数学学伴';
  assert.match(companionIssue(value, skills, 1), /学伴简介/);
  value.introduction = '帮助学生检查思路';
  assert.equal(companionIssue(value, skills, 1), '');
  assert.equal(companionIssue(value, skills, 2), '');
  assert.match(companionIssue(value, skills), /学习对象/);
  value.task.audience = '全班学生'; value.task.scenario = '课堂学习'; value.task.taskAndGoals = '说明自己的解题思路';
  assert.equal(companionIssue(value, skills), '');
  value.design.contextual = true;
  assert.match(companionIssue(value, skills), /教学情景/);
  value.design.context = '学校用水'; value.design.question = '如何减少浪费？';
  value.design.pbl = true;
  assert.match(companionIssue(value, skills), /PBL/);
  value.design.drivingQuestion = '如何节水？'; value.design.product = '改进方案'; value.design.stages = '调查\n设计\n展示';
  assert.equal(companionIssue(value, skills), '');
  assert.match(companionIssue(value, []), /已移除/);
  assert.equal(JSON.stringify(skills), original);
});
test('任务上下文包含教师方法、三项场景和实际文本材料，不编造附件解析结果', () => {
  const value = newCompanion('buddy', skills[0].id); value.name = '科学学伴'; value.task.taskAndGoals = '用证据解释结论';
  value.task.audience = '学习小组'; value.task.scenario = '自主学习';
  value.materials = [{ id: 'm', name: '调查.txt', type: 'text/plain', size: 12, data: '', text: '真实调查记录' },
    { id: 'p', name: '教材.pdf', type: 'application/pdf', size: 12, data: '', text: '' }];
  const context = companionContext(value, skills);
  assert.ok(context.includes(skills[0].skill.name)); assert.match(context, /学习任务与目标：用证据解释结论/);
  assert.match(context, /学习情境：自主学习/); assert.match(context, /学习对象：学习小组/);
  assert.match(context, /真实调查记录/); assert.match(context, /教材.pdf（附件）/);
  assert.deepEqual(readCompanions(JSON.stringify([value])), [value]);
  assert.throws(() => readCompanions('{bad')); assert.throws(() => readCompanions('[{}]'));
  assert.throws(() => readCompanions(JSON.stringify([{ ...value, version: 3 }])));
});
test('按授权移除旧九项任务，保留学伴名称、SKILL 关系和材料', () => {
  const old = { id: 'old', name: '旧学伴', skillIds: [skills[0].id], step: 2, status: 'draft', updatedAt: '2026-10-10',
    task: { title: '旧任务', audience: '七年级学生', subject: '数学', duration: '两课时', goals: '解释错因', priorKnowledge: '掌握移项',
      instructions: '先回顾解题步骤', deliverable: '纠错记录', assessment: '能说明理由' },
    design: newCompanion('old').design, materials: [{ id: 'm', name: '课堂.txt', type: 'text/plain', size: 8, text: '课堂记录', data: 'data:text/plain;base64,QQ==' }] };
  const raw = JSON.stringify([old]);
  const [current] = readCompanions(raw);
  assert.equal(current.step, 1); assert.equal(current.status, 'draft'); assert.equal(current.name, old.name);
  assert.deepEqual(current.task, newCompanion('old').task);
  assert.deepEqual(current.skillIds, old.skillIds); assert.deepEqual(current.materials, old.materials);
  assert.doesNotMatch(companionContext(current, skills), /掌握移项|纠错记录|先回顾解题步骤|旧任务/);
  assert.deepEqual(readCompanions(JSON.stringify([current])), [current]);
  assert.equal(readCompanions(JSON.stringify([{ ...old, status: 'ready' }]))[0].status, 'draft');
  assert.equal(raw, JSON.stringify([old]));
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
