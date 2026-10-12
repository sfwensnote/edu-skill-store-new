import { boundaryPrefix } from './teaching-method';
import { methodPreviewCases } from './method-preview';
import { demoSkillReply } from './skill-preview';
import { dimensions, type DetectionCase, type MethodInput, type RecordedMessage } from './execution';

// 浏览器演示只呈现教师方法的有限情境，不产生真实模型验证资格。
export const previewModel = 'browser-method-preview-v1';
export function previewMessage(role: RecordedMessage['role'], content: string): RecordedMessage {
  return { id: crypto.randomUUID(), role, content, at: new Date().toISOString(), activations: [] };
}
export function previewCases(method: MethodInput): DetectionCase[] {
  const { skill } = method;
  const steps = methodPreviewCases([skill]);
  const ending = skill.constraints.find(item => item.startsWith(boundaryPrefix))?.slice(boundaryPrefix.length) || '';
  const situations = steps.map((step, index) => ({
    id: `${method.entryId}:step:${index}`, title: `情况 ${index + 1}`, scenario: step.condition,
    kind: 'step' as const, target: index, studentTurns: [step.studentInput], expected: step.action,
    reply: demoSkillReply({ skill, caseId: step.id, messages: [{ role: 'user', content: step.studentInput }] }),
  }));
  const result: DetectionCase[] = situations.map(item => {
    const messages = [previewMessage('user', item.studentTurns[0]), previewMessage('assistant', item.reply)];
    const { reply: _reply, ...situation } = item;
    return { ...situation, messages, verdicts: dimensions.map(dimension => ({
      dimension, status: 'uncertain', evidence: [],
      reason: (dimension === 'trigger' ? `请核对开始条件：${skill.trigger}` : dimension === 'steps' ? `请核对教师做法：${item.expected}`
        : dimension === 'principles' ? skill.constraints.filter(p => !p.startsWith(boundaryPrefix)).join('；') || '教师未设置额外原则。'
          : `结束条件：${ending || '待补充'}`).slice(0, 1200),
    })) };
  });
  if (ending) {
    result.push({ id: `${method.entryId}:ending`, title: '结束引导', scenario: ending, kind: 'ending', target: 0,
      studentTurns: ['我已经完成这次任务，能说清自己的做法。'], expected: '达到教师设定的结束条件后收束引导。',
      messages: [previewMessage('user', '我已经完成这次任务，能说清自己的做法。'), previewMessage('assistant', '本次引导到这里结束。你可以按刚才的方法继续独立练习。')],
      verdicts: dimensions.map(dimension => ({ dimension, status: dimension === 'ending' ? 'uncertain' : 'not-applicable',
        reason: dimension === 'ending' ? `请核对是否应当结束：${ending}` : '此情境核对结束方式。', evidence: [] })),
    });
  }
  return result;
}
export function previewReply(method: MethodInput, caseId: string, input: RecordedMessage) {
  const example = previewCases(method).find(item => item.id === caseId);
  if (!example) throw new Error('教学情境已变化，请重新选择。');
  const reply = previewMessage('assistant', example.messages.at(-1)!.content);
  reply.activations = [{ entryId: method.entryId, step: example.target, ended: example.kind === 'ending',
    reason: '采用教师选择的教学情境。', evidence: [{ messageId: input.id, quote: input.content }] }];
  return reply;
}
