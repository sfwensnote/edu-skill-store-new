import test from 'node:test';
import assert from 'node:assert/strict';
import { clearLegacyTaskContent } from '../shared/legacy-task-cleanup';
import { companionsKey, newCompanion } from '../shared/learning-companion';
import { accountWorkspace } from '../src/lib/account-workspace';

const marketKey = 'teaching-method.market-workspace.v1';
function store() {
  const values = new Map<string, string>();
  return { values, get length() { return values.size; }, key: (i: number) => [...values.keys()][i] ?? null,
    getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); } };
}
test('旧任务和草稿清空，只移除旧学伴附加要素，新场景及 SKILL 完整保留且不重复写入', () => {
  const storage = store(), current = newCompanion('current', 'skill');
  current.task = { audience: '全班学生', scenario: '课堂学习', taskAndGoals: '新的任务与目标' };
  const companion = { ...current, legacyTask: { title: '旧任务内容' } };
  const workspace = { version: 1, tasks: [{ id: 'old' }], activityDrafts: [{ id: 'old-draft' }], sharedSkillIds: ['skill'], addedSkills: [{ id: 'added' }], designs: [{ id: 'design' }] };
  storage.setItem(marketKey, JSON.stringify(workspace)); storage.setItem(companionsKey, JSON.stringify([companion]));
  storage.setItem('teaching-assistant.frontend-demo.v2', 'SKILL 原资料');
  assert.equal(clearLegacyTaskContent(storage), 2);
  assert.deepEqual(JSON.parse(storage.getItem(marketKey)!), { ...workspace, tasks: [], activityDrafts: [] });
  assert.deepEqual(JSON.parse(storage.getItem(companionsKey)!), [current]);
  assert.equal(storage.getItem('teaching-assistant.frontend-demo.v2'), 'SKILL 原资料');
  assert.equal(clearLegacyTaskContent(storage), 0);
});
test('清理写入失败回滚并可重试，损坏或未知版本不覆盖', () => {
  const storage = store(), marketRaw = JSON.stringify({ version: 1, tasks: [{ id: 'old' }] });
  const companionRaw = JSON.stringify([{ ...newCompanion('current'), legacyTask: {} }]);
  storage.setItem(marketKey, marketRaw); storage.setItem(companionsKey, companionRaw);
  const broken = { getItem: storage.getItem, setItem: (key: string, value: string) => {
    if (key === companionsKey) throw new Error('full'); storage.setItem(key, value);
  } };
  assert.throws(() => clearLegacyTaskContent(broken));
  assert.equal(storage.getItem(marketKey), marketRaw); assert.equal(storage.getItem(companionsKey), companionRaw);
  assert.equal(clearLegacyTaskContent(storage), 2);
  for (const raw of ['{broken', JSON.stringify([{ ...newCompanion('future'), version: 3, legacyTask: {} }])]) {
    storage.setItem(companionsKey, raw); assert.equal(clearLegacyTaskContent(storage), 0); assert.equal(storage.getItem(companionsKey), raw);
  }
});
test('旧任务清理按账号隔离，不触碰其他教师和一次性 SKILL 清理标记', () => {
  const storage = store(), a = accountWorkspace(storage, 'a'), b = accountWorkspace(storage, 'b');
  const raw = JSON.stringify({ version: 1, tasks: [{ id: 'old' }] });
  a.setItem(marketKey, raw); b.setItem(marketKey, raw);
  storage.setItem('teaching-method.skill-reset.2026-10-10.v1', 'done');
  assert.equal(clearLegacyTaskContent(a), 1); assert.equal(b.getItem(marketKey), raw);
  assert.equal(storage.getItem('teaching-method.skill-reset.2026-10-10.v1'), 'done');
});
