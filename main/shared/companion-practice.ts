import type { MethodInput, RecordedMessage, Trial } from './execution';
import type { LearningCompanion } from './learning-companion';
import { previewCases, previewMessage, previewReply } from './execution-preview';

// 学伴演示在整场对话中匹配有限的学生表现，不接受教师指定要执行的步骤。
export function practiceInputs(companion: LearningCompanion, methods: MethodInput[]) {
  const inputs = [...new Set(methods.flatMap(method => previewCases(method).filter(item => item.kind !== 'ending').map(item => item.studentTurns[0])))];
  return [`学习任务：${companion.task.taskAndGoals.slice(0, 800)}\n${inputs[0] || '我还不知道从哪里开始，可以帮我理清思路吗？'}`,
    ...inputs.slice(1), '我已经完成这次任务，能说清自己的做法。'];
}
export function practiceReply(trial: Trial, input: RecordedMessage, history: RecordedMessage[]) {
  const text = input.content.trim();
  const candidates = trial.methods.flatMap(method => previewCases(method).map(example => ({ method, example })));
  const previous = history.filter(message => message.role === 'assistant').flatMap(message => message.activations).at(-1);
  const exact = candidates.filter(({ example }) => text === example.studentTurns[0] || text.endsWith(`\n${example.studentTurns[0]}`));
  const matches = exact.length ? exact : candidates.filter(({ example }) => example.kind !== 'ending' && (
    (/回顾/.test(text) && /还是|仍|还没|不知道/.test(text) && /回顾/.test(example.scenario) && /还是|仍|没有|未/.test(example.scenario)) ||
    (!/回顾/.test(text) && /答案不对|答错|不知道哪里错|出了错/.test(text) && /答错|错误/.test(example.scenario) && !/回顾|仍|再次/.test(example.scenario))
  ));
  const available = matches.filter(({ example, method }) => example.kind !== 'ending' || previous?.entryId === method.entryId);
  // 同一句话对应多个方法时保留当前方法；无法消歧则追问，不伪造触发记录。
  const matched = available.length === 1 ? available[0] : available.find(item => item.method.entryId === previous?.entryId && item.example.kind !== 'ending');
  if (!matched) return previewMessage('assistant', `我们先围绕这次学习任务讨论。\n${trial.companion.task.taskAndGoals}\n请补充题目、你的做法和遇到的困难。`);
  const reply = previewReply(matched.method, matched.example.id, input);
  reply.activations[0].reason = `根据本轮学生表达对应教学方法中的情况：${matched.example.scenario}`;
  return reply;
}
