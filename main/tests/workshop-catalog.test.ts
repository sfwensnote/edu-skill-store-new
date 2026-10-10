import test from 'node:test';
import assert from 'node:assert/strict';
import { initialMine } from '../src/data/platform';
import { assistantSkillEntries } from '../shared/marketplace';
import {
  defaultWorkFilters,
  filterWork,
  restoreWorkshopSearch,
  workshopCollections,
} from '../src/features/workshop/workshop-catalog';

function catalog() {
  const skills = assistantSkillEntries(initialMine);
  return workshopCollections({
    skills,
    allEntries: skills,
    assistants: initialMine,
    favorites: [skills[0].id, 'design:lesson:2', 'missing'],
    shared: [skills[1].id, 'design:lesson:1', 'missing'],
  });
}
test('我的 SKILL 仅收录方法，旧探究收藏与展示不会混入计数', () => {
  const c = catalog();
  assert.deepEqual(Object.keys(c), ['skills', 'favorites', 'showcase']);
  assert.equal(c.skills.length, 6);
  assert.deepEqual(c.favorites.map((item) => item.kind), ['skill']);
  assert.deepEqual(c.showcase.map((item) => item.kind), ['skill']);
});
test('搜索教学内容并组合筛选，按真实日期排序；无日期项保持稳定顺序', () => {
  const c = catalog();
  assert.equal(
    filterWork(c.skills, '反思', { ...defaultWorkFilters, query: '数学', subject: '数学' }).length,
    2,
  );
  assert.equal(filterWork(c.skills, '', { ...defaultWorkFilters, query: 'needsReview' }).length, 0);
  assert.equal(filterWork(c.skills, '', { ...defaultWorkFilters, area: 'inquiry' }).length, 0);
  const items = c.skills.slice(0, 3).map((item, i) => ({
    ...item,
    updatedAt: [undefined, '2026-10-02', '2026-10-08'][i],
    createdAt: ['2026-10-09', undefined, '2026-10-01'][i],
  }));
  assert.deepEqual(
    filterWork(items, '', defaultWorkFilters).map((i) => i.id),
    [items[2].id, items[1].id, items[0].id],
  );
  assert.deepEqual(
    filterWork(items, '', { ...defaultWorkFilters, sort: 'created' }).map((i) => i.id),
    [items[0].id, items[2].id, items[1].id],
  );
  assert.deepEqual(
    filterWork(
      items.map((i) => ({ ...i, updatedAt: undefined })),
      '',
      defaultWorkFilters,
    ).map((i) => i.id),
    items.map((i) => i.id),
  );
});
test('分类筛选恢复时保留合法字段，损坏数据和无效枚举退回默认', () => {
  assert.deepEqual(restoreWorkshopSearch('{broken'), { query: '', panels: {} });
  const restored = restoreWorkshopSearch(
    JSON.stringify({
      query: '费用',
      panels: { skills: { query: '证据', sort: 'name', area: 'unknown', subject: 4 }, pbl: { query: '旧项目' } },
    }),
  );
  assert.equal(restored.query, '费用');
  assert.deepEqual(Object.keys(restored.panels), ['skills']);
  assert.deepEqual(restored.panels.skills, { ...defaultWorkFilters, query: '证据', sort: 'name' });
});

test('未完成方法可以在我的 SKILL 中恢复，但不会当作已形成方法应用或展示', () => {
  const assistant = {
    ...initialMine[0],
    id: 'unfinished-method',
    skills: [],
    status: 'DRAFT' as const,
    goal: '引导学生寻找证据',
  };
  const c = workshopCollections({
    skills: [],
    allEntries: [],
    assistants: [assistant],
    favorites: [],
    shared: [],
  });
  assert.equal(c.skills[0].kind, 'method-draft');
  assert.equal(c.skills[0].canUse, false);
  assert.equal(c.skills[0].status, '尚未形成 SKILL');
  assert.equal(c.showcase.length, 0);
  const empty = workshopCollections({
    skills: [],
    allEntries: [],
    assistants: [{ ...assistant, goal: '' }],
    favorites: [],
    shared: [],
  });
  assert.equal(empty.skills.length, 0);
});
