import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyProject } from '../shared/domain';
import { canOpenStep, completeThrough, getResumeStep, normalizeProject } from '../shared/workflow';

test('新项目只能进入第一步，完成后只开放相邻步骤', () => {
  const project = emptyProject();
  assert.equal(getResumeStep(project), 0);
  assert.equal(canOpenStep(project, 1), false);
  const next = completeThrough(project, 1);
  assert.equal(getResumeStep(next), 1);
  assert.equal(canOpenStep(next, 1), true);
  assert.equal(canOpenStep(next, 2), false);
});

test('旧项目按已有成果保守恢复', () => {
  const project = emptyProject();
  const legacy = { ...project, completedThrough: undefined, brief: { audience: '七年级', goal: '理解方程', task: '讲评', boundary: '不直接给答案' }, skills: [{ id: 's', name: '提示', description: '提示', reason: '需要', education: '支架', technology: '规则', instruction: '逐步提示', enabled: true }] };
  assert.equal(normalizeProject(legacy).completedThrough, 1);
});
