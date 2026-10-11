import test from 'node:test';
import assert from 'node:assert/strict';
import { skillSchema } from '../shared/assistant';
import { validSkillIcon, skillIconMaxBytes } from '../shared/skill-icon';
import { methodFromSkill, packageTeachingMethod } from '../shared/teaching-method';
import { addMarketSkill, assistantSkillEntries, parseMarketWorkspace } from '../shared/marketplace';
import { completeTeachingMethod } from './fixtures/teaching-method';
import { initialMine } from '../src/data/platform';

const icon = { color: '#3b6d9a', image: 'data:image/png;base64,aGVsbG8=' };
test('旧方法无图标仍可读取，图标配置在编辑与重新封装时保留', () => {
  const skill = packageTeachingMethod({ ...completeTeachingMethod(), icon }, 'icon-method');
  assert.equal(skillSchema.safeParse(skill).success, true);
  assert.deepEqual(packageTeachingMethod(methodFromSkill(skill), skill.id).icon, icon);
  delete skill.icon;
  assert.equal(skillSchema.safeParse(skill).success, true);
});
test('发布来源的只读添加快照与刷新保留图标，独立于原作者后续修改', () => {
  const skill = packageTeachingMethod({ ...completeTeachingMethod(), icon }, 'icon-method');
  const source = assistantSkillEntries([{ ...initialMine[0], skills: [skill] }])[0];
  const added = addMarketSkill([], source, '2026-10-11T12:00:00Z');
  source.skill.icon!.color = '#25634f';
  const restored = parseMarketWorkspace(JSON.stringify({ version: 1, addedSkills: added }));
  assert.deepEqual(restored.addedSkills[0].skill.icon, icon);
});
test('图标拒绝外部链接、SVG、不合法颜色和超过限额的图片', () => {
  for (const value of [{ color: 'red' }, { color: '#abc' }, { image: 'https://example.com/icon.png' },
    { image: 'data:image/svg+xml;base64,PHN2Zz4=' }, { image: `data:image/png;base64,${'A'.repeat(skillIconMaxBytes * 2)}` }]) {
    assert.equal(validSkillIcon(value), undefined);
  }
});
