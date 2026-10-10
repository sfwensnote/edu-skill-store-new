import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newContextualDesign,
  rentalSampleDesign,
  buildContextualProblem,
  createTaskChain,
  createPblProject,
  invalidateContext,
  copyContextualDesign,
  contextualMarkdown,
  sampleOriginal,
} from '../shared/contextual-design';
import { assistantSkillEntries, parseMarketWorkspace, addMarketSkill } from '../shared/marketplace';
import { marketSkills } from './fixtures/marketplace';

test('添加保留独立来源快照，重复添加不覆盖版本、不取得编辑权限', () => {
  const source = structuredClone(assistantSkillEntries(initialMine)[0]);
  const added = addMarketSkill([], source, '2026-10-10T08:00:00Z');
  assert.equal(added[0].assistantId, undefined);
  assert.equal(added[0].addedFrom?.id, source.id);
  assert.deepEqual(added[0].skill, source.skill);
  source.skill.name = '来源后续修改';
  assert.notEqual(added[0].skill.name, source.skill.name);
  assert.equal(addMarketSkill(added, source, '2026-10-11T08:00:00Z'), added);
});
test('集市存储兼容旧记录，过滤坏快照、去重并去掉注入的所有权字段', () => {
  assert.deepEqual(parseMarketWorkspace(JSON.stringify({ version: 1 })).addedSkills, []);
  const snapshot = addMarketSkill([], marketSkills[0], '2026-10-10T08:00:00Z')[0];
  const restored = parseMarketWorkspace(JSON.stringify({ version: 1,
    addedSkills: [snapshot, snapshot, { ...snapshot, assistantId: 'owned' },
      { ...snapshot, skill: null }, { ...snapshot, id: 'personal:forged' }],
  }));
  assert.equal(restored.addedSkills.length, 1);
  assert.equal(restored.addedSkills[0].assistantId, undefined);
});
import { packageTeachingMethod, upsertMethodSkill, type TeachingMethod } from '../shared/teaching-method';
import { initialMine } from '../src/data/platform';

test('租赁样例保留原关系、定义域和可核对的完整答案', () => {
  const d = rentalSampleDesign('rental');
  const p = buildContextualProblem(d);
  assert.equal(d.originalProblem, sampleOriginal);
  assert.equal(p.mode, 'sample');
  assert.equal(p.confirmed, false);
  for (const text of ['8x + 10', '5x + 25', 'x > 0']) assert.ok(p.retainedRelations.includes(text));
  for (const text of ['x = 5', '50 元', 'A 26 元、B 35 元', 'A 74 元、B 65 元'])
    assert.ok(p.answerKey.includes(text));
  assert.ok(p.context.includes('虚构'));
  assert.ok(p.question.includes('不取整'));
});
test('自定义原题进入教师框架，绝不套用数学示例或推断答案', () => {
  const d = {
    ...newContextualDesign('custom'),
    subject: '物理',
    originalProblem: '质量为 2kg，速度为 3m/s，求动能。',
    knowledgePoint: '动能',
  };
  const p = buildContextualProblem(d);
  assert.equal(p.mode, 'template');
  assert.equal(p.question, d.originalProblem);
  assert.equal(p.context, '');
  assert.equal(p.answerKey, '');
  assert.ok(!JSON.stringify(p).includes('8x + 10'));
});
test('上游变化保留教师任务与项目，撤销关联核对并要求重新检查', () => {
  let d = newContextualDesign('upstream');
  d = {
    ...d,
    contextualProblem: { ...buildContextualProblem(d), confirmed: true },
    taskChain: createTaskChain(d),
    pblProject: createPblProject(d),
  };
  d.taskChain!.tasks[1].requirement = '教师自定义要求';
  d.taskChain!.needsReview = false;
  d.pblProject!.needsReview = false;
  const changed = invalidateContext(d, { originalProblem: '更改后的原题' });
  assert.equal(changed.taskChain?.tasks[1].requirement, '教师自定义要求');
  assert.equal(changed.taskChain?.needsReview, true);
  assert.equal(changed.pblProject?.needsReview, true);
  assert.equal(changed.contextualProblem?.confirmed, false);
  assert.equal(changed.currentLevel, d.currentLevel);
});
test('作品副本可独立修改，导出涵盖原题、任务链和项目而不冒充 SKILL', () => {
  let d = newContextualDesign('original');
  d = {
    ...d,
    contextualProblem: buildContextualProblem(d),
    taskChain: createTaskChain(d),
    pblProject: createPblProject(d),
    savedLevels: [1, 2, 3],
  };
  const copy = copyContextualDesign(d, 'copy');
  assert.equal(copy.pblProject!.name, `${d.pblProject!.name}（副本）`);
  copy.taskChain!.tasks[0].title = '副本任务';
  copy.pblProject!.name = '副本项目';
  assert.notEqual(copy.taskChain!.tasks[0].id, d.taskChain!.tasks[0].id);
  assert.notEqual(d.taskChain!.tasks[0].title, '副本任务');
  assert.notEqual(d.pblProject!.name, '副本项目');
  const md = contextualMarkdown(d, 3);
  for (const section of ['教学内容', '情境任务链', 'PBL 项目方案', '实施时间与条件'])
    assert.ok(md.includes(section));
  assert.equal('skill' in d, false);
});
test('SKILL 来自教师条件做法与原则，名称随场景变化，编辑不丢失其他 SKILL', () => {
  const m: TeachingMethod = {
    problem: '学生阅读时找不到证据',
    expectedOutcome: '能用原文支持观点',
    trigger: '观点缺少依据时',
    teachingSteps: [{ condition: '观点缺少依据时', action: '请他标出支持观点的句子' }],
    principles: ['不直接替学生找答案'],
  };
  const reading = packageTeachingMethod(m, 'reading', '阅读证据提取');
  assert.ok(reading.name.includes('阅读证据提取'));
  assert.ok(reading.summary.includes(m.teachingSteps[0].action));
  const custom = packageTeachingMethod({ ...m, name: '教师命名', description: '教师简介' }, 'reading');
  assert.equal(custom.name, '教师命名');
  assert.equal(custom.summary, '教师简介');
  const existing = initialMine[0].skills;
  const result = upsertMethodSkill(existing, { ...existing[0], name: '修改后' });
  assert.equal(result.length, existing.length);
  assert.deepEqual(result[1], existing[1]);
  assert.notEqual(result[0].name, existing[0].name);
  assert.deepEqual(reading.constraints, m.principles);
  assert.deepEqual(reading.steps, m.teachingSteps);
});
test('新的工坊存储不替代旧助手，损坏的可选数据不会阻止页面加载', () => {
  assert.equal(assistantSkillEntries(initialMine).length, 6);
  assert.ok(assistantSkillEntries(initialMine).every((e) => e.area === 'daily'));
  assert.deepEqual(parseMarketWorkspace('{broken').designs, []);
  assert.deepEqual(
    parseMarketWorkspace(
      JSON.stringify({
        version: 1,
        designs: [{ id: 'broken', savedLevels: [1], readiness: [] }],
        tasks: [{ id: 'broken', submissions: [] }],
      }),
    ).designs,
    [],
  );
  assert.deepEqual(
    parseMarketWorkspace(
      JSON.stringify({ version: 1, designs: [], tasks: [{ id: 'broken', submissions: [] }] }),
    ).tasks,
    [],
  );
  assert.deepEqual(
    parseMarketWorkspace(JSON.stringify({ version: 1, designs: [], favorites: ['x', 5], tasks: [] }))
      .favorites,
    ['x'],
  );
});

test('跨板块挂载后每项 SKILL 仍保留自己的来源板块', () => {
  const source = structuredClone(initialMine[0]);
  source.skillAreas = { [source.skills[1].id]: 'inquiry' };
  source.skillSources = { [source.skills[1].id]: '来自情境指导示例的独立副本' };
  const entries = assistantSkillEntries([source]);
  assert.equal(entries[0].area, 'daily');
  assert.equal(entries[1].area, 'inquiry');
  assert.equal(entries[1].source, '来自情境指导示例的独立副本');
  assert.equal(entries[0].demo, true);
});
