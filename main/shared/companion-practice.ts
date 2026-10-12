import type { MethodInput, RecordedMessage, Trial } from './execution';
import type { LearningCompanion } from './learning-companion';
import { getCompanionCase, isCompanionCaseMethod, type CompanionCase } from './companion-cases';
import { previewCases, previewMessage, previewReply } from './execution-preview';

export const companionEndingInput = '我已经完成这次任务，能说清自己的做法。';
// 否定或犹豫的表达只追问，不当作完成当前步骤。
const negativeInput = /(不会|不知道|不懂|不明白|不清楚|没学会|没听懂|没学过|猜的|不确定)/;
const endingInput = /(已经完成|完成了|完成这次任务|说清楚自己的做法|先到这里|可以结束|结束本次引导|结束了|不用了)/;
// 教师改过学习任务后只按新任务有限引导，不再套用案例原题，也不假称理解了新题。
const genericTurns = [
  { match: [/[0-9]/, /题目|算式|题|答案|做法/],
    reply: '我看到了你写的题目和做法。请先说说你第一步做了什么，再标出你不确定的地方。',
    prompt: '这次试运行使用的是你修改后的学习任务。请先把这道题的题目、算式和你的做法发给我。' },
  { match: [/第一步|做法|思路|检查|不确定|不会|这里|这一步|错/],
    reply: '请把你说的这一步改一次，并说说这样改的理由。',
    prompt: '请说说你第一步做了什么，以及哪一步还不确定。' },
  { match: [/改正|改好|改成|理由|因为|所以|总结|会了/],
    reply: '收到你的修改和理由。本次引导到这里结束，内置案例不再套用，具体判断请在教师端确认。',
    prompt: '请把不确定的那一步改一次，并说说这样改的理由。' },
];
const genericSuggestions = ['请先把这道题的题目、算式和你的做法发给我。', '我第一步是……，但我不确定这一步对不对。', '我把不确定的那一步改了一次，理由是……'];

// 学伴演示在整场对话中匹配有限的学生表现，不接受教师指定要执行的步骤。
export function practiceInputs(companion: LearningCompanion, methods: MethodInput[]) {
  const bundle = getCompanionCase(companion.caseId);
  if (bundle && usesCompanionCaseTask(companion, bundle)) return [...bundle.turns.map(turn => turn.example), companionEndingInput];
  if (bundle) return [`学习任务：${companion.task.taskAndGoals.slice(0, 800)}\n${genericSuggestions[0]}`, ...genericSuggestions.slice(1), companionEndingInput];
  const inputs = [...new Set(methods.flatMap(method => previewCases(method).filter(item => item.kind !== 'ending').map(item => item.studentTurns[0])))];
  return [`学习任务：${companion.task.taskAndGoals.slice(0, 800)}\n${inputs[0] || '我还不知道从哪里开始，可以帮我理清思路吗？'}`,
    ...inputs.slice(1), companionEndingInput];
}
// 学习任务是案例的一部分：被改动后不再使用案例原题，历史试运行仍用当时的快照。
function usesCompanionCaseTask(companion: LearningCompanion, bundle: CompanionCase) {
  return companion.task.taskAndGoals.trim() === bundle.companion.task.taskAndGoals.trim();
}
// 只有出现该轮的标准回复才算完成，追问不计入进度。
function completedTurns(history: RecordedMessage[], replies: string[]) {
  let index = 0;
  replies.forEach((reply, position) => {
    if (history.some(message => message.role === 'assistant' && message.content === reply)) index = Math.max(index, position + 1);
  });
  return index;
}
// 手改任务后的引导不涉及案例方法触发，不写入 activations，避免伪造步骤轨迹。
function companionGenericReply(input: RecordedMessage, history: RecordedMessage[]) {
  const next = completedTurns(history, genericTurns.map(turn => turn.reply)), text = input.content.trim();
  let content = '本次引导已经结束。你可以开始新的试运行，或自己再练一题。';
  if (next < genericTurns.length) {
    if (endingInput.test(text)) content = '好，本次引导到这里结束。具体判断请在教师端确认。';
    else {
      const target = genericTurns.findIndex((turn, position) => position >= next && turn.match.some(pattern => pattern.test(text)));
      content = target < 0 ? genericTurns[next].prompt : genericTurns[target].reply;
    }
  }
  return previewMessage('assistant', content);
}
function companionCaseReply(bundle: CompanionCase, trial: Trial, input: RecordedMessage, history: RecordedMessage[]) {
  const method = trial.methods.find(item => item.entryId === bundle.methods[0].entryId) || trial.methods[0];
  const next = completedTurns(history, bundle.turns.map(turn => turn.reply)), text = input.content.trim();
  if (next >= bundle.turns.length) return previewMessage('assistant', '本次引导已经结束。你可以开始新的试运行，或自己再练一题。');
  if (endingInput.test(text)) {
    const reply = previewMessage('assistant', next === 0
      ? '好，我们先停在这里。下次开始前，先把 1/2 + 1/3 的算式和你的做法准备好。'
      : `好，本次引导到这里结束。你已经完成前 ${next} 步，下次可以接着把“什么情况下能直接把分子相加”说完整。`);
    reply.activations = [{ entryId: method.entryId, step: Math.max(0, next - 1), ended: true,
      reason: `学生表示结束本次引导，已经完成前 ${next} 步。`, evidence: [{ messageId: input.id, quote: input.content }] }];
    return reply;
  }
  // 未匹配、否定或错误说法只追问，不伪造方法触发记录。
  const matched = bundle.turns.find((turn, position) => position >= next && turn.match.some(pattern => pattern.test(text)) &&
    !negativeInput.test(text) && !(turn.reject || []).some(pattern => pattern.test(text)) && (turn.require || []).every(pattern => pattern.test(text)));
  if (!matched) return previewMessage('assistant', bundle.turns[next].prompt);
  const position = bundle.turns.indexOf(matched);
  const reply = previewMessage('assistant', matched.reply);
  reply.activations = [{ entryId: method.entryId, step: position, ended: matched.ended === true,
    reason: `对应内置案例第 ${position + 1} 步：${matched.example}`, evidence: [{ messageId: input.id, quote: input.content }] }];
  return reply;
}
export function practiceReply(trial: Trial, input: RecordedMessage, history: RecordedMessage[]) {
  const bundle = getCompanionCase(trial.companion.caseId);
  if (bundle && trial.methods.some(method => isCompanionCaseMethod(trial.companion, method)))
    return usesCompanionCaseTask(trial.companion, bundle)
      ? companionCaseReply(bundle, trial, input, history)
      : companionGenericReply(input, history);
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
