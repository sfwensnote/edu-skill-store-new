import test from 'node:test';
import assert from 'node:assert/strict';
import { buildContextualProblem, createTaskChain, rentalSampleDesign } from '../shared/contextual-design';
import { assistantSkillEntries, parseMarketWorkspace } from '../shared/marketplace';
import { initialMine } from '../src/data/platform';
import {
  activityStepIssue,
  compatibilityIssue,
  isActivityDraft,
  learningResources,
  learningTaskSnapshot,
  newActivityDraft,
  settingsIssue,
  simulateMethodPlan,
  simulationFingerprint,
  skillPermissionIssue,
  type LearningActivityDraft,
  type SkillApplicationDraft,
} from '../shared/teaching-activity';

function fixtures() {
  const design = rentalSampleDesign('activity-source');
  design.contextualProblem = { ...buildContextualProblem(design), confirmed: true };
  design.taskChain = { ...createTaskChain(design), needsReview: true };
  design.savedLevels = [1, 2];
  const assistant = {
    ...structuredClone(initialMine[0]),
    id: 'owned-teacher',
    revision: 2,
    status: 'TESTED' as const,
  };
  const entry = assistantSkillEntries([assistant])[0];
  return { design, entry, resources: learningResources([design]), owned: [entry.id] };
}

test('学习活动只提供已确认的作品，任务设置与作品独立保存', () => {
  const { design, entry, resources } = fixtures();
  assert.deepEqual(
    resources.map((r) => r.level),
    [1],
  );
  const draft = newActivityDraft('learning', 'activity') as LearningActivityDraft;
  draft.resourceKey = resources[0].key;
  draft.settings.title = '教师活动名称';
  draft.settings.instructions = '记录你的推理过程';
  const task = learningTaskSnapshot(draft, resources[0], entry);
  task.design!.contextualProblem!.question = '活动快照中的独立修改';
  task.supportSkill!.skill.name = '快照方法';
  assert.notEqual(design.contextualProblem!.question, task.design!.contextualProblem!.question);
  assert.notEqual(entry.skill.name, task.supportSkill!.skill.name);
  assert.equal(task.status, 'draft');
  assert.equal(task.title, '教师活动名称');
  assert.ok(!('publishedAt' in task));
  const submitted = {
    ...task,
    submissions: [
      { answers: { 回答: '原有学习证据' }, submittedAt: new Date().toISOString(), feedback: '教师提示' },
    ],
  };
  const preserved = learningTaskSnapshot(
    { ...draft, settings: { ...draft.settings, title: '新的活动名称' } },
    resources[0],
    entry,
    submitted,
  );
  assert.deepEqual(preserved, submitted);
});

test('绑定教学支持需要方法所有权、教师核对、适用范围与固定版本', () => {
  const { design, entry, resources, owned } = fixtures();
  assert.ok(skillPermissionIssue(entry, []));
  assert.ok(skillPermissionIssue({ ...entry, demo: true }, owned));
  assert.equal(compatibilityIssue(entry, design), '');
  assert.ok(compatibilityIssue({ ...entry, subject: '英语' }, design));
  const draft = newActivityDraft('learning', 'binding') as LearningActivityDraft;
  draft.step = 3;
  draft.resourceKey = resources[0].key;
  draft.settings.title = '活动';
  draft.settings.instructions = '说明';
  draft.supportSkillId = entry.id;
  draft.supportVersion = entry.version;
  assert.equal(activityStepIssue(draft, resources, [entry], owned, []), '');
  assert.match(activityStepIssue(draft, resources, [{ ...entry, version: 'v3.0' }], owned, []), /版本/);
  draft.supportSkillId = '';
  assert.equal(activityStepIssue(draft, resources, [], owned, []), '');
});

test('活动对象和时间有效性被检查，不要求可选智能支持', () => {
  const draft = newActivityDraft('learning', 'time') as LearningActivityDraft;
  draft.settings.title = '活动';
  draft.settings.instructions = '独立完成';
  assert.equal(settingsIssue(draft.settings), '');
  draft.settings.audience = 'class';
  assert.match(settingsIssue(draft.settings), /学习对象/);
  draft.settings.audienceLabel = '七年级一班';
  draft.settings.startsAt = '2026-10-12T09:00';
  draft.settings.endsAt = '2026-10-11T09:00';
  assert.match(settingsIssue(draft.settings), /截止时间/);
});

test('SKILL 模拟只展示计划，不生成 Agent 响应，配置和方法修改使证据失效', () => {
  const { entry } = fixtures();
  const draft = newActivityDraft('skill', 'application') as SkillApplicationDraft;
  draft.skillId = entry.id;
  draft.scenario = '学生第一次回答错误';
  const unknown = simulateMethodPlan(draft, entry);
  assert.deepEqual(unknown.plannedSteps, []);
  draft.assessment = 'trigger';
  const simulation = simulateMethodPlan(draft, entry);
  assert.ok(simulation.plannedSteps.length > 0);
  assert.ok(!('agentResponse' in simulation));
  assert.equal(simulation.fingerprint, simulationFingerprint(draft, entry));
  assert.notEqual(simulation.fingerprint, simulationFingerprint({ ...draft, scope: '新的介入范围' }, entry));
  assert.notEqual(simulation.fingerprint, simulationFingerprint(draft, { ...entry, version: 'v5.0' }));
  assert.ok(!('settings' in draft));
  assert.ok(!('instructions' in draft));
});

test('草稿解析保留旧任务，不接受破损表单或模拟证据', () => {
  const draft = newActivityDraft('learning', 'saved');
  assert.equal(isActivityDraft(draft), true);
  assert.equal(isActivityDraft({ ...draft, settings: {} }), false);
  assert.equal(isActivityDraft({ ...draft, step: 9 }), false);
  const application = newActivityDraft('skill', 'application') as SkillApplicationDraft;
  assert.equal(
    isActivityDraft({ ...application, simulation: { fingerprint: 'fake', plannedSteps: [] } }),
    false,
  );
  const stored = parseMarketWorkspace(
    JSON.stringify({
      version: 1,
      tasks: [
        learningTaskSnapshot(
          { ...(draft as LearningActivityDraft), id: 'legacy' },
          fixtures().resources[0],
          undefined,
        ),
      ],
      activityDrafts: [draft, { id: 'broken' }],
    }),
  );
  assert.equal(stored.tasks[0].id, 'legacy');
  assert.equal(stored.activityDrafts.length, 1);
});

test('应用位置内容改变后旧模拟失效，新增学习记录不改变方法配置证据', () => {
  const { entry, resources, owned } = fixtures();
  const learning = newActivityDraft('learning', 'target') as LearningActivityDraft;
  learning.settings.title = '原活动';
  learning.settings.instructions = '记录自己的依据';
  const target = learningTaskSnapshot(learning, resources[0], undefined);
  const draft = newActivityDraft('skill', 'configuration') as SkillApplicationDraft;
  Object.assign(draft, {
    step: 3,
    skillId: entry.id,
    skillVersion: entry.version,
    targetTaskId: target.id,
    scope: '学生第一次答错',
    scenario: '第一次答错并说明过程',
    assessment: 'trigger',
  });
  draft.simulation = simulateMethodPlan(draft, entry, target);
  assert.equal(activityStepIssue(draft, resources, [entry], owned, [target]), '');
  assert.match(
    activityStepIssue(draft, resources, [entry], owned, [{ ...target, instructions: '修改了活动要求' }]),
    /重新|当前配置/,
  );
  assert.equal(
    activityStepIssue(draft, resources, [entry], owned, [
      {
        ...target,
        submissions: [{ answers: { 回答: '学习记录' }, feedback: '', submittedAt: new Date().toISOString() }],
      },
    ]),
    '',
  );
});
