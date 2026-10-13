import { emptyMethod, methodError, type CreationDraft, type TeachingMethod } from './teaching-method';

export function directCreationDraft(): CreationDraft {
  return { originalIdea: '', exampleIdea: false, grade: '', subject: '', teachingScene: '', stage: 'method',
    method: { ...emptyMethod(), teachingSteps: [{ condition: '', action: '' }] }, conversation: [], questionIndex: 0, manualEdits: [] };
}

// 教师填写步骤动作；沿用已有 condition 字段，旧方法条件保留，新增步骤按先后顺序封装。
export function prepareDirectMethod(method: TeachingMethod): TeachingMethod {
  return { ...method, teachingSteps: method.teachingSteps.filter((step, index) => index === 0 || step.action.trim()).map((step, index) => ({
    ...step, condition: step.condition.trim() || (index === 0 ? method.trigger.trim() : `完成上一步后，继续步骤 ${index + 1}`),
  })) };
}

export function directDraftError(draft: CreationDraft): string {
  if (!draft.grade.trim()) return '请选择学段。';
  if (!draft.subject.trim()) return '请选择学科。';
  if (!draft.method.teachingSteps[0]?.action.trim()) return '请填写步骤 1。';
  return methodError(prepareDirectMethod(draft.method));
}
