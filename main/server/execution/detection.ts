import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { complete, parseModelJson } from '../models';
import { detectionPassed, dimensions, evidenceIssue, methodInputSchema, methodSteps, testSituationSchema,
  verdictSchema, type Detection, type MethodInput, type Verification } from '../../shared/execution';
import { fingerprint, modelIdentity, execute, recorded, safeFailure } from './runtime';
import { ExecutionError, get, list, save } from './repository';
import { assertJobCapacity, schedule } from './jobs';

export function checkCoverage(method: MethodInput, situations: z.infer<typeof testSituationSchema>[]) {
  if (situations.some(item => item.kind === 'step' ? item.target >= methodSteps(method.skill).length
    : item.kind === 'principle' ? item.target >= method.skill.constraints.length : item.target !== 0))
    throw new ExecutionError('检测情境引用了不存在的教学步骤或原则。', 502);
  for (const kind of ['trigger', 'nontrigger', 'ending'] as const)
    if (!situations.some(item => item.kind === kind)) throw new ExecutionError('检测情境未覆盖开始、不触发和结束条件。', 502);
  for (const [kind, count] of [['step', methodSteps(method.skill).length], ['principle', method.skill.constraints.length]] as const)
    for (let target = 0; target < count; target++)
      if (!situations.some(item => item.kind === kind && item.target === target))
        throw new ExecutionError('检测情境未覆盖全部教学步骤和原则。', 502);
  if (situations.some(item => item.kind === 'ending' && item.studentTurns.length < 2))
    throw new ExecutionError('检测结束条件需要连续对话。', 502);
}
export function startDetection(ownerId: string, input: unknown) {
  const method = methodInputSchema.parse(input);
  if (!methodSteps(method.skill).length) throw new ExecutionError('请补充教学步骤。');
  if (!method.skill.constraints.some(value => /结束条件[:：]/.test(value))) throw new ExecutionError('请补充结束条件后再检测。');
  const model = modelIdentity();
  assertJobCapacity();
  if (list('detection', ownerId).some(item => item.status === 'running'))
    throw new ExecutionError('检测正在进行，请等待完成。', 429);
  const detection: Detection = { id: randomUUID(), ownerId, method, model, fingerprint: fingerprint(method),
    status: 'running', cases: [], error: '', createdAt: new Date().toISOString() };
  save('detection', ownerId, detection, method.entryId);
  schedule(async () => {
    try {
      const situations = parseModelJson(await complete('DESIGN', `你是教学方法测试设计者。根据教师方法生成可实际执行的学生测试情境，不生成模型回复。
必须覆盖：触发(trigger)、不应触发(nontrigger)、每个教学步骤(step)、每条原则(principle)、结束(ending)。
step/principle 的 target 为从0开始的对应序号，其余 target 为0。结束测试至少两轮，其他每项1至3轮。
每项 studentTurns 是具体学生发言，符合该教学情境和教师步骤，不使用万能占位语。后续发言应能检验当前步骤的推进或结束。
expected 写可观察的执行要求，不能把提供正确答案当作所有方法的共同目标。
返回纯 JSON {"situations":[{"title":"标题","scenario":"教学情境","kind":"trigger","target":0,"studentTurns":["学生发言"],"expected":"执行要求"}]}。
仅输出覆盖所需的测试，最多19项，方法如下：${JSON.stringify(method.skill)}`,
        [{ role: 'user', content: '请生成完整检测情境。' }], 6500),
        z.object({ situations: z.array(testSituationSchema).min(3).max(19) })).situations;
      checkCoverage(method, situations);
      detection.cases = situations.map(item => ({ ...item, id: randomUUID(), messages: [], verdicts: [] }));
      save('detection', ownerId, detection, method.entryId);
      for (const item of detection.cases) {
        for (const studentInput of item.studentTurns) {
          if (modelIdentity() !== model) throw new ExecutionError('检测期间模型配置发生变化，请重新检测。');
          item.messages.push(recorded('user', studentInput));
          save('detection', ownerId, detection, method.entryId);
          item.messages.push(await execute([method], item.scenario, item.messages));
          save('detection', ownerId, detection, method.entryId);
        }
        const verdicts = parseModelJson(await complete('DESIGN', `你是教学方法执行核验者。下面的模型回复是实际执行记录，不预设成功。
分别检查 trigger/steps/principles/ending 四项，恰好各一项。status 可为 pass/fail/uncertain/not-applicable。
只有该情境确实不涉及某维度时可 not-applicable。无法判断应 uncertain；违反要求应 fail。
每个适用结论必须引用实际消息编号和逐字原文；steps/principles/ending 要引用模型实际回复。
判断触发是否符合教师条件、当前步骤是否正确、是否违反原则、是否在教师规定条件达到后结束。
返回纯 JSON {"verdicts":[{"dimension":"trigger","status":"pass","reason":"具体理由","evidence":[{"messageId":"编号","quote":"逐字原文"}]}]}。
教师方法：${JSON.stringify(method.skill)}\n情境与要求：${JSON.stringify({ ...item, messages: undefined, verdicts: undefined })}`,
          [{ role: 'user', content: JSON.stringify(item.messages) }]), z.object({ verdicts: z.array(verdictSchema).length(4) })).verdicts;
        const required = { trigger: 'trigger', nontrigger: 'trigger', step: 'steps', principle: 'principles', ending: 'ending' }[item.kind];
        if (new Set(verdicts.map(v => v.dimension)).size !== dimensions.length || verdicts.some(v =>
          evidenceIssue(v.evidence, item.messages) || (v.status !== 'not-applicable' && (!v.evidence.length ||
            (v.dimension !== 'trigger' && !v.evidence.some(e => item.messages.some(m => m.id === e.messageId && m.role === 'assistant'))))) ||
          (v.dimension === required && v.status === 'not-applicable')))
          throw new ExecutionError('检测结论缺少有效对话证据，请重新检测。', 502);
        item.verdicts = verdicts;
        save('detection', ownerId, detection, method.entryId);
      }
      detection.status = detectionPassed(detection.cases) ? 'review' : 'failed';
    } catch (error) { detection.status = 'failed'; detection.error = safeFailure(error); }
    save('detection', ownerId, detection, method.entryId);
  });
  return detection;
}
export function confirmDetection(ownerId: string, id: string) {
  const detection = get('detection', id, ownerId);
  if (detection.model !== modelIdentity() || detection.status !== 'review' || !detectionPassed(detection.cases))
    throw new ExecutionError('只有完整检测通过的当前方法可以确认。');
  if (list('detection', ownerId, detection.method.entryId)[0]?.id !== id) throw new ExecutionError('请确认最新一次检测。');
  detection.status = 'verified'; detection.confirmedAt = new Date().toISOString();
  return save('detection', ownerId, detection, detection.method.entryId);
}
export function verifiedMethods(ownerId: string): Verification[] {
  const model = modelIdentity(), seen = new Set<string>();
  return list('detection', ownerId).flatMap(item => {
    if (seen.has(item.method.entryId)) return [];
    seen.add(item.method.entryId);
    return item.status === 'verified' && item.model === model ? [{ entryId: item.method.entryId, detectionId: item.id, fingerprint: item.fingerprint, skill: item.method.skill }] : [];
  });
}
export function requireVerified(ownerId: string, methods: MethodInput[]) {
  const verified = verifiedMethods(ownerId);
  return methods.map(method => {
    const proof = verified.find(item => item.entryId === method.entryId && item.fingerprint === fingerprint(method));
    if (!proof) throw new ExecutionError(`请先完成“${method.skill.name}”的真实检测并确认结果。`);
    return proof.detectionId;
  });
}
