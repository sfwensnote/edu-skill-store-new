import { boundaryPrefix, type TeachingMethod } from '../../shared/teaching-method';

export function completeTeachingMethod(overrides: Partial<TeachingMethod> = {}): TeachingMethod {
  return {
    name: '错因追问', description: '帮助学生检查自己的解题思路', category: '错因辅导', tags: ['错因辅导'],
    problem: '学生答错后等待答案', expectedOutcome: '能独立检查思路', trigger: '学生第一次答错时',
    teachingSteps: [{ condition: '学生第一次答错', action: '请学生回顾解题步骤' }],
    ...overrides,
    principles: [...(overrides.principles || []), `${boundaryPrefix}学生能独立说明思路后结束引导`],
  };
}
