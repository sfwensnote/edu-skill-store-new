import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accountSessionKey, accountsKey, loginAccount, primaryTeacherId, readAccounts, readAccountSession,
  registerTeacher, setTeacherDisabled } from '../shared/local-accounts';
import { accountWorkspace, accountWorkspaceKey, ownersStorageKey, readPublishedSkills,
  marketWorkspaceKey } from '../src/lib/account-workspace';
import { initialMine } from '../src/data/platform';
import type { TeachingAssistant } from '../shared/assistant';

class MemoryStorage {
  data = new Map<string, string>();
  get length() { return this.data.size; }
  key(index: number) { return [...this.data.keys()][index] ?? null; }
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
  removeItem(key: string) { this.data.delete(key); }
}
test('登录校验密码，刷新恢复身份；过期或停用不恢复会话', async () => {
  const storage = new MemoryStorage(), sessions = new MemoryStorage();
  await assert.rejects(loginAccount(storage, sessions, { login: 'teacher', password: 'wrong123' }), /账号或密码/);
  assert.equal(sessions.getItem(accountSessionKey), null);
  const teacher = await loginAccount(storage, sessions, { login: ' TEACHER ', password: 'teacher123' });
  assert.equal(teacher.role, 'teacher');
  assert.equal('hash' in teacher, false);
  assert.deepEqual(readAccountSession(storage, sessions), teacher);
  assert.equal(readAccountSession(storage, sessions, Date.now() + 9 * 3600000), null);
  await assert.rejects(loginAccount(storage, sessions, { login: 'teacher', password: 'wrong123' }), /账号或密码/);
  assert.equal(readAccountSession(storage, sessions)?.id, primaryTeacherId);
});
test('注册只创建教师，不存明文密码；重复账号不覆盖现有资料', async () => {
  const storage = new MemoryStorage(), sessions = new MemoryStorage();
  const user = await registerTeacher(storage, sessions, { login: 'teacher2', password: 'password123', name: '李老师', role: 'admin' });
  assert.equal(user.role, 'teacher');
  assert.equal(storage.getItem(accountsKey)!.includes('password123'), false);
  const before = storage.getItem(accountsKey);
  await assert.rejects(registerTeacher(storage, sessions, { login: 'teacher2', password: 'different123', name: '覆盖' }), /已注册/);
  assert.equal(storage.getItem(accountsKey), before);
  sessions.removeItem(accountSessionKey);
  assert.equal((await loginAccount(storage, sessions, { login: 'teacher2', password: 'password123' })).name, '李老师');
});
test('管理员可停用和启用教师；教师不能管理账号，停用不会删除作品', async () => {
  const storage = new MemoryStorage(), sessions = new MemoryStorage();
  storage.setItem(ownersStorageKey, '保留的作品');
  await loginAccount(storage, sessions, { login: 'teacher', password: 'teacher123' });
  assert.throws(() => setTeacherDisabled(storage, sessions, primaryTeacherId, true), /仅管理员/);
  await loginAccount(storage, sessions, { login: 'admin', password: 'admin123' });
  assert.throws(() => setTeacherDisabled(storage, sessions, 'demo-admin', true), /教师账号/);
  setTeacherDisabled(storage, sessions, primaryTeacherId, true);
  await assert.rejects(loginAccount(storage, new MemoryStorage(), { login: 'teacher', password: 'teacher123' }), /已停用/);
  assert.equal(storage.getItem(ownersStorageKey), '保留的作品');
  setTeacherDisabled(storage, sessions, primaryTeacherId, false);
  assert.equal((await loginAccount(storage, sessions, { login: 'teacher', password: 'teacher123' })).role, 'teacher');
});
test('账号存储失败不产生登录会话；损坏的账号资料不会被默认账号覆盖', async () => {
  const storage = new MemoryStorage(), sessions = new MemoryStorage();
  sessions.setItem = () => { throw new Error('存储写入失败'); };
  await assert.rejects(loginAccount(storage, sessions, { login: 'teacher', password: 'teacher123' }));
  assert.equal(readAccountSession(storage, sessions), null);
  storage.setItem(accountsKey, '损坏的账号资料');
  assert.throws(() => readAccounts(storage), /无法读取/);
  assert.equal(storage.getItem(accountsKey), '损坏的账号资料');
});
test('首个教师保留原存储，其他账号的草稿和核对记录独立，不能读取无关键', () => {
  const storage = new MemoryStorage();
  storage.setItem(ownersStorageKey, '已有方法');
  const first = accountWorkspace(storage, primaryTeacherId), second = accountWorkspace(storage, 'another-teacher');
  const draft = 'teaching-assistant.method-draft.v1:same-id', progress = 'teaching-assistant.check-progress:same-id';
  first.setItem(draft, '首个教师草稿'); second.setItem(draft, '另一个教师草稿'); second.setItem(progress, '另一个教师核对');
  assert.equal(first.getItem(ownersStorageKey), '已有方法');
  assert.equal(second.getItem(ownersStorageKey), null);
  assert.equal(first.getItem(draft), '首个教师草稿');
  assert.equal(second.getItem(draft), '另一个教师草稿');
  assert.equal(first.getItem(progress), null);
  assert.equal(second.length, 2);
  assert.equal(second.key(0), draft);
  assert.throws(() => second.getItem(accountsKey));
  second.removeItem(draft);
  assert.equal(first.getItem(draft), '首个教师草稿');
  assert.equal(storage.getItem(accountWorkspaceKey('another-teacher', progress)), '另一个教师核对');
});
test('已发布方法在同一浏览器的集市共享，其他教师没有原作者编辑权', () => {
  const storage = new MemoryStorage();
  const assistant: TeachingAssistant = { ...structuredClone(initialMine[0]), revision: 1, status: 'TESTED' };
  const entryId = `personal:${assistant.id}:${assistant.skills[0].id}`;
  storage.setItem(ownersStorageKey, JSON.stringify([assistant]));
  storage.setItem(marketWorkspaceKey, JSON.stringify({ version: 1, sharedSkillIds: [entryId] }));
  const own = readPublishedSkills(storage, primaryTeacherId), foreign = readPublishedSkills(storage, 'another-teacher');
  assert.equal(own.length, 1); assert.equal(own[0].assistantId, assistant.id);
  assert.equal(foreign.length, 1); assert.equal(foreign[0].assistantId, undefined);
  assert.equal(foreign[0].creator, '教师');
  storage.setItem(accountsKey, JSON.stringify({ version: 1, accounts: readAccounts(storage).map(a => a.id === primaryTeacherId ? { ...a, disabled: true } : a) }));
  assert.equal(readPublishedSkills(storage, 'another-teacher').length, 1);
  assistant.status = 'DRAFT';
  storage.setItem(ownersStorageKey, JSON.stringify([assistant]));
  assert.deepEqual(readPublishedSkills(storage, 'another-teacher'), []);
});
