import { completeTeachingMethod } from './fixtures/teaching-method';
import test from 'node:test';
import assert from 'node:assert/strict';
import { packageTeachingMethod, methodFromSkill } from '../shared/teaching-method';
import { parseInquiryStartDraft } from '../shared/inquiry-workflow';
import { copyContextualDesign, contextualMarkdown } from '../shared/contextual-design';
import { parseMarketWorkspace } from '../shared/marketplace';
import { categoryOf, tagsOf, catalogBase, defaultCatalogFilters, restoreCatalogFilters } from '../src/features/marketplace/market-catalog';
import { teachingCategories, suggestedTags, isPblTag, teachingTagsOf } from '../shared/teaching-tags';
import { skillSchema } from '../shared/assistant';
import { marketSkills } from './fixtures/marketplace';

test('教师选择的场景和自定义标签在 SKILL 封装与重新编辑时保留', () => {
  const method = completeTeachingMethod({
    problem: '学生求解方程时停滞',
    expectedOutcome: '能解释每一步变形',
    trigger: '学生不能说明下一步操作时',
    teachingSteps: [{ condition: '学生停滞时', action: '请学生说明已经完成的变形' }],
    principles: ['不直接给答案'],
    category: '智能练习' as const,
    tags: ['一元一次方程', '七年级'],
  });
  const skill = packageTeachingMethod(method, 'tagged');
  assert.deepEqual(skill.tags, method.tags);
  assert.equal(skill.category, method.category);
  assert.deepEqual(methodFromSkill(skill).tags, method.tags);
  skill.tags!.push('副本标签');
  assert.equal(method.tags!.length, 2);
});

test('集市使用教师选择而不是文本猜测，标签能搜索、筛选且显式清空后不复活', () => {
  const entry = {
    ...marketSkills[0],
    skill: { ...marketSkills[0].skill, category: '知识讲解' as const, tags: ['一元一次方程'] },
  };
  assert.equal(categoryOf(entry), '知识讲解');
  assert.ok(tagsOf(entry).includes('一元一次方程'));
  assert.equal(tagsOf(entry).includes('证据追问'), false);
  assert.equal(catalogBase([entry], { ...defaultCatalogFilters, tag: '一元一次方程' }).length, 1);
  assert.equal(catalogBase([entry], { ...defaultCatalogFilters, query: '一元一次方程' }).length, 1);
  const cleared = { ...entry, skill: { ...entry.skill, category: null, tags: [] } };
  assert.equal(categoryOf(cleared), '未分类');
  assert.deepEqual(tagsOf(cleared), []);
});

test('情境探究标签在起始草稿、作品恢复、复制与导出中保留', () => {
  const design = parseInquiryStartDraft(JSON.stringify({
    subject: '数学', originalProblem: '一次函数问题', learningGoal: '比较两个函数',
    tags: ['一次函数', '费用比较'],
  }));
  assert.deepEqual(design.tags, ['一次函数', '费用比较']);
  const workspace = parseMarketWorkspace(JSON.stringify({ version: 1, designs: [design] }));
  assert.deepEqual(workspace.designs[0].tags, design.tags);
  const copy = copyContextualDesign(design, 'tag-copy');
  copy.tags!.push('副本');
  assert.equal(design.tags!.length, 2);
  assert.ok(contextualMarkdown(design, 1).includes('一次函数、费用比较'));
});

test('没有新字段的旧集市方法仍可按原有分类发现', () => {
  const entry = structuredClone(marketSkills[0]);
  delete entry.skill.category;
  delete entry.skill.tags;
  assert.equal(categoryOf(entry), '错因辅导');
  assert.ok(tagsOf(entry).includes('错因辅导'));
});

test('PBL 分类与标签退出展示，旧来源快照仍完整恢复', () => {
  const skill = { ...marketSkills[4].skill, category: '项目式学习' as const, tags: ['pbl 项目', '任务链设计', '证据追问'] };
  assert.equal(skillSchema.safeParse(skill).success, true);
  const entry = { ...marketSkills[4], skill, area: 'inquiry' as const, scene: 'PBL 项目反思' };
  const added = { ...entry, id: `added:${entry.id}`, addedFrom: { id: entry.id, addedAt: '2026-10-10T08:00:00Z' } };
  const restored = parseMarketWorkspace(JSON.stringify({ version: 1, addedSkills: [added] }));
  assert.deepEqual(restored.addedSkills[0], added);
  assert.equal(parseInquiryStartDraft(JSON.stringify({ category: '项目式学习' })).category, '项目式学习');
  assert.equal(categoryOf(added), '未分类');
  assert.deepEqual(tagsOf(added), ['证据追问']);
  assert.equal(catalogBase([added], { ...defaultCatalogFilters, query: 'PBL' }).length, 0);
  assert.equal(catalogBase([added], { ...defaultCatalogFilters, tag: '证据追问' }).length, 1);
  assert.equal(teachingTagsOf({ ...entry.skill, tags: undefined }, entry.scene, entry.area).some(isPblTag), false);
});

test('已取消的分类、标签和板块缓存不继续遮挡集市内容', () => {
  const restored = restoreCatalogFilters(JSON.stringify({ area: 'inquiry', category: '项目式学习', tag: 'PBL 项目反思', subject: '数学' }));
  assert.deepEqual(restored, { ...defaultCatalogFilters, subject: '数学' });
  assert.deepEqual(teachingCategories, ['课堂提问', '错因辅导', '智能练习', '知识讲解']);
  assert.equal(suggestedTags.some(isPblTag), false);
  assert.equal(marketSkills.flatMap(tagsOf).some(isPblTag), false);
});
