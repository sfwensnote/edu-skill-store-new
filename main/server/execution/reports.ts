import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { complete, parseModelJson } from '../models';
import { evidenceIssue, findingSchema, reportLimitation, reviewSchema, type TrialReport } from '../../shared/execution';
import { ExecutionError, get, list, save } from './repository';
import { modelIdentity, safeFailure } from './runtime';
import { assertJobCapacity, schedule } from './jobs';

export async function createReport(ownerId: string, trialId: string) {
  const trial = get('trial', trialId, ownerId);
  if (trial.status === 'open' && Date.parse(trial.expiresAt) > Date.now()) throw new ExecutionError('请先结束试用再生成报告。');
  const sessions = list('session', ownerId, trialId).filter(item => item.audience === 'student');
  if (sessions.some(item => item.pending)) throw new ExecutionError('还有对话正在执行，请稍候再生成报告。', 409);
  const prior = list('report', ownerId, trialId)[0];
  if (prior && prior.status !== 'failed') return prior;
  const messages = sessions.flatMap(item => item.messages);
  const completeTurns = sessions.reduce((n, item) => n + item.messages.filter(message => message.role === 'assistant').length, 0);
  const model = messages.length ? modelIdentity() : '';
  assertJobCapacity();
  const report: TrialReport = { id: randomUUID(), trialId, createdAt: new Date().toISOString(),
    studentCount: sessions.length, turnCount: completeTurns, findings: [], limitation: reportLimitation, status: 'running', error: '' };
  save('report', ownerId, report, trialId);
  schedule(async () => {
    try {
      const findings: TrialReport['findings'] = sessions.flatMap(session => (session.failures || []).flatMap(failure => {
        const message = session.messages.find(item => item.id === failure.messageId);
        return message ? [{ aspect: 'runtime' as const, severity: 'concern' as const,
          description: `处理这条学生输入时请求未完成：${failure.error}`,
          evidence: [{ messageId: message.id, quote: message.content }] }] : [];
      }));
      if (messages.length) {
        // 分批分析，不截断学生记录；逐条证据在服务器校验。
        for (const session of sessions) {
          if (!session.messages.length) continue;
          if (modelIdentity() !== model) throw new ExecutionError('报告分析期间模型配置发生变化，请重新生成。');
          const result = parseModelJson(await complete('DESIGN', `你是教师试用报告分析者。只分析记录中的学生表现与教学行为，不推断学习效果提升，不写学习成效或因果结论。
分别分析 learning（学生问题、困难、尝试或完成的任务）、skill（触发、执行、误触发、原则和结束）、runtime（错误回答、不恰当引导、异常）。
触发记录是系统判断而非正确执行的证明，必须核对实际消息与教师方法；缺少证据不作结论。
每个发现必须引用实际对话消息编号与逐字原文。报告可以表述“学生在对话中完成某任务”，不能表述能力、成绩或学习效果已提升。
severity 取 observation 或 concern。返回纯 JSON {"findings":[{"aspect":"learning","severity":"observation","description":"具体观察","evidence":[{"messageId":"编号","quote":"逐字原文"}]}]}，最多8项。
教学场景：${JSON.stringify(trial.companion.task)}\n教学材料：${JSON.stringify(trial.companion.materials.map(m => ({ name: m.name, text: m.text })))}
方法：${JSON.stringify(trial.methods)}\n已记录的请求异常：${JSON.stringify(session.failures || [])}`,
            [{ role: 'user', content: JSON.stringify(session.messages) }], 5000), z.object({ findings: z.array(findingSchema).max(8) }));
          if (result.findings.some(item => evidenceIssue(item.evidence, session.messages) ||
            /(?:学习效果|学习成效|成绩|能力|学习水平).{0,12}(?:提升|提高|改善|增强|进步)|(?:提升|提高|改善|增强).{0,12}(?:学习效果|成绩|能力|学习水平)/.test(item.description)))
            throw new ExecutionError('报告包含缺少证据或超出对话范围的结论，请重新生成。', 502);
          findings.push(...result.findings);
        }
      }
      report.findings = findings; report.status = 'ready';
    } catch (error) { report.status = 'failed'; report.error = safeFailure(error); }
    save('report', ownerId, report, trialId);
  });
  return report;
}
export function reviewReport(ownerId: string, id: string, input: unknown) {
  const report = get('report', id, ownerId);
  if (report.status !== 'ready') throw new ExecutionError('报告尚未完成，不能确认。');
  report.review = { ...reviewSchema.parse(input), at: new Date().toISOString() };
  return save('report', ownerId, report, report.trialId);
}
