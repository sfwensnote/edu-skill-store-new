import test from 'node:test';
import assert from 'node:assert/strict';
import { resetExistingSkills, skillResetKey } from '../shared/skill-reset';
import { marketSkills } from '../src/data/marketplace';
import { skillTrialBindings } from '../src/data/skill-trial-bindings';

class MemoryStorage {
  values = new Map<string, string>();
  failKey = '';
  get length() { return this.values.size; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) {
    if (key === this.failKey) throw new Error('写入被阻止');
    this.values.set(key, value);
  }
  removeItem(key: string) { this.values.delete(key); }
}
const ownersKey = 'teaching-assistant.frontend-demo.v2';
const workspaceKey = 'teaching-method.market-workspace.v1';

test('清空集市自带方法和案例；一次清理现有个人 SKILL、快照与相关缓存', () => {
  assert.equal(marketSkills.length, 0);
  assert.equal(skillTrialBindings.length, 0);
  const storage = new MemoryStorage();
  for (const key of [ownersKey, `${ownersKey}.recovery:old`, 'teaching-assistant.excluded-skills.v1',
    'teaching-assistant.method-draft.v1:old', 'teaching-assistant.check-progress:old']) storage.setItem(key, '旧 SKILL');
  storage.setItem('unrelated-preference', '保留');
  const design = { id: 'old-design', teacherNotes: '非 SKILL 的原始资料' };
  storage.setItem(workspaceKey, JSON.stringify({ version: 1, designs: [design], addedSkills: [{ id: 'added:old' }],
    sharedSkillIds: ['personal:old'], favorites: ['sample-reflect'],
    tasks: [{ id: 'skill-task', kind: 'skill' }, { id: 'design-task', kind: 'design', supportSkill: { id: 'old' } }],
    activityDrafts: [{ id: 'skill-config', path: 'skill' }, { id: 'learning-config', path: 'learning', supportSkillId: 'old', supportVersion: 'v1' }],
  }));
  assert.equal(resetExistingSkills(storage), true);
  assert.equal(storage.getItem(ownersKey), null);
  assert.equal(storage.getItem('teaching-assistant.method-draft.v1:old'), null);
  assert.equal(storage.getItem(`${ownersKey}.recovery:old`), null);
  assert.equal(storage.getItem(skillResetKey), 'done');
  assert.equal(storage.getItem('unrelated-preference'), '保留');
  const workspace = JSON.parse(storage.getItem(workspaceKey)!);
  assert.deepEqual(workspace.addedSkills, []);
  assert.deepEqual(workspace.sharedSkillIds, []);
  assert.deepEqual(workspace.favorites, []);
  assert.deepEqual(workspace.designs, [design]);
  assert.deepEqual(workspace.tasks, [{ id: 'design-task', kind: 'design' }]);
  assert.deepEqual(workspace.activityDrafts, [{ id: 'learning-config', path: 'learning', supportSkillId: '' }]);
});

test('完成清理后新建、添加与发布的资料不在下一次启动时被删除', () => {
  const storage = new MemoryStorage();
  resetExistingSkills(storage);
  storage.setItem(ownersKey, '清理后创建的方法');
  storage.setItem(workspaceKey, JSON.stringify({ addedSkills: [{ id: 'new' }], sharedSkillIds: ['new'] }));
  const before = [...storage.values];
  assert.equal(resetExistingSkills(storage), false);
  assert.deepEqual([...storage.values], before);
});

test('完成标记写入失败时恢复已清理资料，权限恢复后可以重试', () => {
  const storage = new MemoryStorage();
  storage.setItem(ownersKey, '原方法');
  storage.setItem(workspaceKey, JSON.stringify({ version: 1, addedSkills: [{ id: 'old' }] }));
  const before = new Map(storage.values);
  storage.failKey = skillResetKey;
  assert.throws(() => resetExistingSkills(storage), /写入被阻止/);
  assert.deepEqual(storage.values, before);
  storage.failKey = '';
  assert.equal(resetExistingSkills(storage), true);
  assert.equal(storage.getItem(ownersKey), null);
});
