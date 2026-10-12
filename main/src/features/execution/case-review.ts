import { z } from 'zod';
import type { Detection, DetectionCase } from '../../../shared/execution';
import { boundaryPrefix, methodError, methodFromSkill, packageTeachingMethod } from '../../../shared/teaching-method';
import { previewCases } from '../../../shared/execution-preview';
import { compileSkillInstructions } from '../../../shared/skill-preview';

export const reviewSchema = z.object({ cursor: z.number().int().min(0), confirmed: z.number().int().min(0) });
export type ReviewedDetection = Detection & { review?: z.infer<typeof reviewSchema> };
export const reviewProgress = (detection: ReviewedDetection) => detection.review || {
  cursor: detection.status === 'verified' ? Math.max(0, detection.cases.length - 1) : 0,
  confirmed: detection.status === 'verified' ? detection.cases.length : 0,
};
export const caseEditSchema = z.object({ scenario: z.string().trim().min(1).max(500), action: z.string().trim().min(1).max(500) });
export type CaseEdit = z.infer<typeof caseEditSchema>;

export function reviseCase(detection: ReviewedDetection, item: DetectionCase, input: CaseEdit) {
  const edit = caseEditSchema.parse(input), method = methodFromSkill(detection.method.skill);
  if (item.kind === 'ending') {
    method.principles = method.principles.map(text => text.startsWith(boundaryPrefix) ? boundaryPrefix + edit.scenario : text);
  } else {
    if (item.kind !== 'step' || !method.teachingSteps[item.target]) throw new Error('这项情况不能在此修改。');
    method.teachingSteps[item.target] = { condition: edit.scenario, action: edit.action };
  }
  const issue = methodError(method); if (issue) throw new Error(issue);
  return method;
}

// 已确认的连续前缀才可计入进度；回看不会重复累计，修改后须重新确认受影响的情况。
export function updateCaseReview(detection: ReviewedDetection, operation: string, body: unknown) {
  const input = z.object({ caseId: z.string(), fingerprint: z.string(), edit: caseEditSchema.optional() }).parse(body);
  if (input.fingerprint !== detection.fingerprint) throw new Error('方法已在其他页面修改，请刷新后重新核对。');
  if (!['review', 'verified'].includes(detection.status)) throw new Error('请先完成情境准备，再核对回复。');
  const progress = reviewProgress(detection), index = detection.cases.findIndex(item => item.id === input.caseId);
  if (index < 0 || index > progress.confirmed) throw new Error('请先确认前面的情况。');
  const item = detection.cases[index];
  if (operation === 'revise-case') {
    if (!input.edit) throw new Error('请填写修改后的描述。');
    const method = reviseCase(detection, item, input.edit);
    const nextMethod = { ...detection.method, skill: packageTeachingMethod(method, detection.method.skill.id) };
    const cases = previewCases(nextMethod);
    // 结束条件参与每种情况的核对，修改结束条件需要从头重新确认。
    const confirmed = Math.min(progress.confirmed, item.kind === 'ending' ? 0 : index);
    const next: ReviewedDetection = { ...detection, method: nextMethod, fingerprint: compileSkillInstructions(nextMethod.skill),
      cases, status: 'review', confirmedAt: undefined, review: { cursor: confirmed, confirmed } };
    return { next, method };
  }
  if (operation !== 'confirm-case' && operation !== 'view-case') throw new Error('未知的核对操作。');
  const confirmed = operation === 'confirm-case' ? Math.max(progress.confirmed, index + 1) : progress.confirmed;
  const cursor = operation === 'confirm-case' ? Math.min(index + 1, detection.cases.length - 1) : index;
  return { next: { ...detection, review: { cursor, confirmed } } as ReviewedDetection };
}
