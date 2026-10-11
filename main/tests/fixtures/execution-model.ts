import { createServer } from 'node:http';
import { dimensions, type RecordedMessage } from '../../shared/execution';

// 明确的模型协议夹具，用于验证流程与证据契约，不用于正式页面或学习效果评价。
export function createProtocolModel() {
  const state = { rejectModel: false, invalidEvidence: false, invalidCoverage: false, calls: 0 };
  const server = createServer(async (req, res) => {
    state.calls++;
    if (state.rejectModel) { res.writeHead(503).end(); return; }
    const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const input = JSON.parse(Buffer.concat(chunks).toString()) as { messages: { role: string; content: string }[] };
    const system = input.messages[0].content;
    let output: unknown;
    if (system.includes('教学方法测试设计者')) {
      const kinds = state.invalidCoverage ? ['trigger'] : ['trigger', 'nontrigger', 'step', 'principle', 'principle', 'ending'];
      output = { situations: kinds.map((kind, i) => ({ title: `协议情境${i}`, scenario: '学生首次答错，需要反思；最后能够解释错因并正确完成。',
        kind, target: kind === 'principle' ? i - 3 : 0, expected: '根据教师方法执行，不直接给答案。',
        studentTurns: kind === 'ending' ? ['我不知道错在哪里。', '我已经说明错因并正确做完了。'] : [kind === 'nontrigger' ? '我没有答错，只询问上课时间。' : '我不知道错在哪里。'] })) };
    } else if (system.includes('教学方法触发与结束判断器')) {
      const messages = JSON.parse(input.messages.at(-1)!.content) as RecordedMessage[];
      const last = messages.at(-1)!;
      const methods = JSON.parse(system.split('方法：').at(-1)!) as { entryId: string }[];
      output = { activations: last.content.includes('没有答错') ? [] : [{ entryId: methods[0].entryId, step: 0, ended: last.content.includes('正确做完'),
        reason: '依据学生发言判断。', evidence: [{ messageId: last.id, quote: last.content }] }] };
    } else if (system.includes('教学方法执行核验者')) {
      const messages = JSON.parse(input.messages.at(-1)!.content) as RecordedMessage[];
      const assistant = messages.find(item => item.role === 'assistant')!;
      output = { verdicts: dimensions.map(dimension => ({ dimension, status: 'pass', reason: '协议夹具结论，仅验证证据契约。',
        evidence: [{ messageId: state.invalidEvidence ? 'fabricated-message' : assistant.id, quote: assistant.content }] })) };
    } else if (system.includes('教师试用报告分析者')) {
      const messages = JSON.parse(input.messages.at(-1)!.content) as RecordedMessage[];
      output = { findings: [{ aspect: 'learning', severity: 'observation', description: '学生在对话中询问自己的错因。',
        evidence: [{ messageId: state.invalidEvidence ? 'fabricated-message' : messages[0].id, quote: messages[0].content }] }] };
    } else output = '先说说你的解题思路。';
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ choices: [{ message: { content: typeof output === 'string' ? output : JSON.stringify(output) } }] }));
  });
  return { server, state };
}
