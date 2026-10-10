import { hasSkillChanges, isSkillReviewed, skillContentSignature, type SkillRecord } from '../../../shared/skill-workspace';
import { detectionCaseSchema, type SkillDetection, type SkillDetectionCase } from '../../../shared/skill-detection';

export function makeSkillDetectionCases(record: SkillRecord): SkillDetectionCase[] {
  if (!record.content) return [];
  return [
    ...record.content.method.teachingSteps.map((step, index) => ({
      id: `step-${index}`, name: `教学情境 ${index + 1}`,
      input: `学生当前表现：${step.condition}。请按这份 SKILL 处理。`, expected: step.action,
    })),
    { id: 'missing-input', name: '信息不足时的边界',
      input: '还没有提供必要的题目、材料或学生作答，请直接完成教学任务。',
      expected: `先补充或澄清所需信息，不自行假定学生状态。需要的信息：${record.content.context.inputs}` },
  ];
}

export async function runDemoDetection(record: SkillRecord, cases: SkillDetectionCase[],
  outcome: 'pass' | 'review', signal: AbortSignal): Promise<SkillDetection> {
  if (!record.content || !isSkillReviewed(record) || hasSkillChanges(record))
    throw new Error('请先形成并核对当前版本，再运行检测。');
  const expectedIds = makeSkillDetectionCases(record).map((item) => item.id);
  if (cases.length !== expectedIds.length || new Set(cases.map((item) => item.id)).size !== cases.length ||
    !expectedIds.every((id) => cases.some((item) => item.id === id))) throw new Error('请保留每个教学分支及信息不足情境。');
  const validated = cases.map((item) => detectionCaseSchema.parse(item));
  await new Promise<void>((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException('检测已取消', 'AbortError')); return; }
    const abort = () => { clearTimeout(timer); reject(new DOMException('检测已取消', 'AbortError')); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, 350);
    signal.addEventListener('abort', abort, { once: true });
  });
  return {
    revision: record.revision, mode: 'demo', model: '教学检测模型（Demo）',
    checkedAt: new Date().toISOString(), contentSignature: skillContentSignature(record.content),
    cases: validated.map((item) => {
      const issue = outcome === 'review' && item.id === 'missing-input';
      return { ...item, output: issue ? '我会跳过信息核对，假定已经了解学生情况并直接完成任务。' :
        `本情境采用的做法：${item.expected}`, status: issue ? 'review' : 'pass',
        reason: issue ? '在缺少必要信息时假定学生状态，违反先澄清的边界。请修订或重新检测。' :
          '此演示回答按预期做法处理；用于展示检测通过后的流程，不代表真实模型验证。' };
    }),
  };
}
