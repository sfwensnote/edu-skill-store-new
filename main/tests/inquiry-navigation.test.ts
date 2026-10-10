import test from 'node:test';
import assert from 'node:assert/strict';
import { newContextualDesign, rentalSampleDesign, createPblProject } from '../shared/contextual-design';
import {
  prepareOutcome,
  outcomeIssue,
  isOutcomeReady,
  parseInquiryStartDraft,
} from '../shared/inquiry-workflow';
import { readRoute, routeHash, returnRoute, navigationRoute, activeNavigationPage } from '../src/lib/routes';

test('新建作品为空；示例需教师主动选用，直接做项目不会创建隐含题目或任务链', () => {
  const blank = newContextualDesign('blank');
  assert.equal(blank.originalProblem, '');
  assert.equal(blank.subject, '');
  const project = prepareOutcome({ ...rentalSampleDesign('project'), currentLevel: 3 }, 3);
  assert.equal(project.contextualProblem, null);
  assert.equal(project.taskChain, null);
  project.pblProject = { ...createPblProject(project), needsReview: false };
  project.readiness = [true, true, true, true, true];
  assert.equal(outcomeIssue(project, 3), '');
  project.savedLevels = [3];
  assert.equal(isOutcomeReady(project, 3), true);
  project.pblProject.needsReview = true;
  assert.equal(isOutcomeReady(project, 3), false);
});
test('任务链可以独立保存，未确认实施条件的项目仍是草稿', () => {
  const d = prepareOutcome(rentalSampleDesign('chain'), 2);
  d.taskChain!.needsReview = false;
  assert.equal(d.contextualProblem, null);
  assert.equal(outcomeIssue(d, 2), '');
  d.pblProject = { ...createPblProject(d), needsReview: false };
  assert.match(outcomeIssue(d, 3), /五项实施条件/);
});
test('空或缺项实施清单不能将 PBL 标为已完成', () => {
  const d = rentalSampleDesign('project-readiness');
  d.pblProject = { ...createPblProject(d), needsReview: false };
  d.savedLevels = [3];
  for (const readiness of [[], [true], [true, true, true, true], [true, true, true, true, true, true]]) {
    assert.match(outcomeIssue({ ...d, readiness }, 3), /五项实施条件/);
    assert.equal(isOutcomeReady({ ...d, readiness }, 3), false);
  }
  assert.equal(outcomeIssue({ ...d, readiness: [true, true, true, true, true] }, 3), '');
});
test('恢复新建表单只读取教学背景，不继承旧作品和错误字段', () => {
  const parsed = parseInquiryStartDraft(
    JSON.stringify({
      title: '校园观察',
      originalProblem: '植物为什么长得不同？',
      subject: 100,
      currentLevel: 3,
      grade: '未知学段',
      contextType: '损坏值',
      createdAt: 'old',
      savedLevels: [1, 2, 3],
      contextualProblem: { confirmed: true },
    }),
  );
  assert.equal(parsed.title, '校园观察');
  assert.equal(parsed.originalProblem, '植物为什么长得不同？');
  assert.equal(parsed.subject, '');
  assert.equal(parsed.grade, '初中');
  assert.equal(parsed.contextType, '校园生活');
  assert.equal(parsed.currentLevel, 3);
  assert.notEqual(parsed.createdAt, 'old');
  assert.deepEqual(parsed.savedLevels, []);
  assert.equal(parsed.contextualProblem, null);
  assert.equal(parseInquiryStartDraft('null').title, '');
  assert.equal(parseInquiryStartDraft('{broken').title, '');
});
test('编辑、预览与来源在刷新后可恢复，返回时保留工坊分类和选择的内容', () => {
  const parent = { page: 'workshop' as const, tab: 'chains' };
  const route = {
    page: 'inquiry-editor' as const,
    designId: '教师/作品',
    level: 2 as const,
    view: 'preview' as const,
    returnTo: routeHash(parent),
  };
  assert.deepEqual(readRoute(routeHash(route)), route);
  assert.deepEqual(returnRoute(readRoute(routeHash(route)), { page: 'home' }), parent);
  const space = {
    page: 'space' as const,
    selection: 'design:teacher:3',
    returnTo: routeHash(route),
  };
  assert.deepEqual(readRoute(routeHash(space)), space);
  assert.deepEqual(readRoute('#/inquiry/%ZZ/1'), { page: 'home' });
  assert.equal(readRoute('#/skill/x?return=https%3A%2F%2Fexample.com').returnTo, undefined);
});
test('任务页查看方法再布置任务时，返回仍指向原作品，避免两页相互返回', () => {
  const origin = { page: 'workshop' as const, tab: 'skills' };
  const task = {
    page: 'space' as const,
    selection: 'skill:reflect',
    returnTo: routeHash(origin),
  };
  const detail = navigationRoute(task, { page: 'skill-detail', skillId: 'reflect' });
  const reopened = navigationRoute(detail, { page: 'space', selection: 'skill:reflect' });
  assert.deepEqual(reopened, task);
  assert.deepEqual(returnRoute(reopened, { page: 'home' }), origin);
  assert.deepEqual(readRoute(routeHash(reopened)), reopened);
  const editor = { page: 'inquiry-editor' as const, designId: 'plant', level: 3 as const };
  const designTask = {
    page: 'space' as const,
    selection: 'design:plant:3',
    returnTo: routeHash(editor),
  };
  const editing = navigationRoute(designTask, editor);
  assert.deepEqual(returnRoute(editing, { page: 'inquiry' }), designTask);
});

test('从详情配置另一项资源时不继承原活动的草稿，返回保持各自来源', () => {
  const origin = { page: 'workshop' as const, tab: 'skills' };
  const original = {
    page: 'space' as const,
    selection: 'skill:reflect',
    returnTo: routeHash(origin),
  };
  const detail = navigationRoute(original, { page: 'skill-detail', skillId: 'hint' });
  const another = navigationRoute(detail, {
    page: 'space',
    selection: 'skill:hint',
    returnTo: routeHash(detail),
  });
  assert.deepEqual(returnRoute(another, { page: 'home' }), detail);
  const draft = {
    page: 'space' as const,
    draftId: 'learning-a',
    selection: undefined,
    returnTo: routeHash(origin),
  };
  const viewed = navigationRoute(draft, { page: 'skill-detail', skillId: 'reflect' });
  const application = navigationRoute(viewed, {
    page: 'space',
    selection: 'skill:reflect',
    returnTo: routeHash(viewed),
  });
  assert.equal(application.page === 'space' ? application.draftId : undefined, undefined);
  assert.deepEqual(returnRoute(application, { page: 'home' }), viewed);
  const resumed = navigationRoute(viewed, { page: 'space', draftId: 'learning-a' });
  assert.deepEqual(resumed, draft);
});

test('方法详情按来源高亮集市、我的作品或教学任务，直接详情链接默认归入集市', () => {
  for (const source of [
    { page: 'market' as const },
    { page: 'workshop' as const, tab: 'skills' },
    { page: 'space' as const, draftId: 'draft-a' },
  ]) {
    const detail = { page: 'skill-detail' as const, skillId: 'reflect', returnTo: routeHash(source) };
    assert.equal(activeNavigationPage(detail), source.page);
    assert.equal(
      activeNavigationPage({ page: 'skill-detail', skillId: 'another', returnTo: routeHash(detail) }),
      source.page,
    );
  }
  assert.equal(activeNavigationPage({ page: 'skill-detail', skillId: 'reflect' }), 'market');
  assert.equal(activeNavigationPage({ page: 'trial-preview', assistantId: 'a', from: 'report' }), 'workshop');
  assert.equal(activeNavigationPage({ page: 'space', selection: 'skill:personal:a:reflect' }), 'workshop');
  const application = { page: 'space' as const, draftId: 'method-application' };
  const detail = { page: 'skill-detail' as const, skillId: 'reflect', returnTo: routeHash(application) };
  assert.equal(activeNavigationPage(application, ['method-application']), 'workshop');
  assert.equal(activeNavigationPage(detail, ['method-application']), 'workshop');
  assert.equal(activeNavigationPage(detail), 'space');
  assert.equal(activeNavigationPage({ ...detail, returnTo: routeHash({ page: 'space', selection: 'skill:reflect' }) }), 'workshop');
  assert.equal(activeNavigationPage({ page: 'space', selection: 'design:a:1' }), 'space');
  assert.equal(activeNavigationPage({ page: 'inquiry-editor', designId: 'a', level: 1 }), 'workshop');
});
