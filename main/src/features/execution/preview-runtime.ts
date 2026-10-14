import { z } from 'zod';
import { readAccountSession } from '../../../shared/local-accounts';
import { companionIssue } from '../../../shared/learning-companion';
import { boundaryPrefix } from '../../../shared/teaching-method';
import { compileSkillInstructions } from '../../../shared/skill-preview';
import { previewCases, previewMessage, previewModel, previewReply } from '../../../shared/execution-preview';
import { activationSchema, methodInputSchema, testSituationSchema, trialInputSchema, verdictSchema, type Detection, type DetectionCase, type MethodInput, type Trial, type TrialSession, type Verification } from '../../../shared/execution';
import { reviewProgress, reviewSchema, updateCaseReview, type ReviewedDetection } from './case-review';
import type { TeachingMethod } from '../../../shared/teaching-method';
import { practiceReply } from '../../../shared/companion-practice';
import { isCompanionCaseMethod } from '../../../shared/companion-cases';
import { completeChat, methodChatRecordSchema, methodMarkdown, type MethodChatRecord } from '../../../shared/method-chat';

type Prepared = { value: ReviewedDetection; prepared: DetectionCase[] };
type Receipt = { sessionId: string; requestId: string; userId: string; replyId: string; entryId: string; caseId: string };
type State = { version: 1; detections: Prepared[]; trials: Trial[]; sessions: TrialSession[]; requests: Receipt[]; methodChats: MethodChatRecord[] };
type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;
export const previewStorageKey = (owner: string) => `teaching-method.execution-preview.v1:${owner}`;
const initial = (): State => ({ version: 1, detections: [], trials: [], sessions: [], requests: [], methodChats: [] });
const messagesSchema = z.array(z.object({ id: z.string(), role: z.enum(['user', 'assistant']), content: z.string(), at: z.string(), activations: z.array(activationSchema) }));
const caseSchema = testSituationSchema.extend({ id: z.string(), messages: messagesSchema, verdicts: z.array(verdictSchema) });
const stateSchema = z.object({
  version: z.literal(1),
  methodChats: z.array(methodChatRecordSchema).default([]),
  detections: z.array(z.object({ prepared: z.array(caseSchema), value: z.object({
    id: z.string(), ownerId: z.string(), method: methodInputSchema, fingerprint: z.string(), model: z.literal(previewModel),
    status: z.enum(['running', 'review', 'failed', 'verified']), cases: z.array(caseSchema), error: z.string(),
    createdAt: z.string(), confirmedAt: z.string().optional(), review: reviewSchema.optional(),
  }) })),
  trials: z.array(trialInputSchema.pick({ companion: true, methods: true }).extend({
    id: z.string(), ownerId: z.string(), verifications: z.array(z.string()), model: z.literal(previewModel),
    status: z.enum(['open', 'closed', 'revoked']), createdAt: z.string(), expiresAt: z.string(), capacity: z.number(),
    purpose: z.enum(['run', 'practice']).optional(),
  })),
  sessions: z.array(z.object({ id: z.string(), trialId: z.string(), audience: z.literal('teacher'), name: z.string(), messages: messagesSchema,
    pending: z.boolean(), error: z.string(), createdAt: z.string(), requestId: z.string().optional() })),
  requests: z.array(z.object({ sessionId: z.string(), requestId: z.uuid(), userId: z.string(), replyId: z.string(), entryId: z.string(), caseId: z.string() })).default([]),
});
export function createPreviewRuntime(storage: StoragePort, ownerId: string, clock = Date.now) {
  const key = previewStorageKey(ownerId);
  function read(): State {
    try {
      const raw = storage.getItem(key); if (!raw) return initial();
      const data = stateSchema.parse(JSON.parse(raw));
      if (data.detections.some(item => item.value.ownerId !== ownerId || (item.value.review &&
        (item.value.review.confirmed > item.value.cases.length || item.value.review.cursor > Math.min(item.value.review.confirmed, item.value.cases.length - 1) ||
        (item.value.status === 'verified' && item.value.review.confirmed !== item.value.cases.length)))) || data.trials.some(item => item.ownerId !== ownerId) ||
        data.sessions.some(item => !data.trials.some(trial => trial.id === item.trialId)) ||
        data.requests.some(item => !data.sessions.some(session => session.id === item.sessionId &&
          session.messages.some(message => message.id === item.userId && message.role === 'user') &&
          session.messages.some(message => message.id === item.replyId && message.role === 'assistant')))) throw new Error();
      return data;
    } catch { throw new Error('核对或试运行记录无法读取，原记录已保留。请检查浏览器存储后重试。'); }
  }
  function save(data: State) {
    try { storage.setItem(key, JSON.stringify(data)); }
    catch { throw new Error('记录未保存，请释放浏览器存储空间后重试。'); }
  }
  function advance(data: State) {
    let changed = false;
    for (const item of data.detections) {
      if (item.value.status !== 'running') continue;
      const count = Math.min(item.prepared.length, Math.floor((clock() - Date.parse(item.value.createdAt)) / 240));
      if (count <= item.value.cases.filter(c => c.verdicts.length).length) continue;
      item.value.cases = item.prepared.map((c, i) => i < count ? c : { ...c, messages: [], verdicts: [] });
      if (count === item.prepared.length) item.value.status = 'review';
      changed = true;
    }
    if (changed) save(data);
  }
  const proofList = (data: State): Verification[] => [...data.detections.filter(item => item.value.status === 'verified')
    .map(({ value }) => ({ entryId: value.method.entryId, detectionId: value.id, fingerprint: value.fingerprint, skill: value.method.skill })),
    ...data.methodChats.filter(chat => chat.confirmedAt && chat.fingerprint === methodMarkdown(chat.method.skill) && completeChat(chat.messages))
      .map(chat => ({ entryId: chat.method.entryId, detectionId: `teacher-chat:${chat.id}`, fingerprint: compileSkillInstructions(chat.method.skill), skill: chat.method.skill }))];
  function trialOf(data: State, id: string) {
    const trial = data.trials.find(item => item.id === id); if (!trial) throw new Error('没有找到本次试运行记录。'); return trial;
  }
  function requireOpen(trial: Trial) {
    if (trial.status !== 'open' || Date.parse(trial.expiresAt) <= clock()) throw new Error('本次试运行已结束，请开始新的试运行。');
  }
  // 校验挂载方法并构造试运行记录；原 trials 接口与 preview 原子接口共用同一套门槛。
  function purposeOf(data: State, trial: Trial) {
    return trial.purpose || (data.sessions.some(session => session.trialId === trial.id && session.audience === 'teacher') ? 'practice' : 'run');
  }
  function prepareTrial(data: State, body: unknown, purpose: 'run' | 'practice' = 'run'): Trial {
    const input = trialInputSchema.parse(body), proofs = proofList(data);
    // 内置案例方法走案例专用途径，其余方法仍必须由教师核对确认。
    const confirmed = (method: MethodInput) => proofs.some(proof => proof.entryId === method.entryId &&
      compileSkillInstructions(proof.skill) === compileSkillInstructions(method.skill));
    if (new Set(input.methods.map(method => method.entryId)).size !== input.methods.length ||
      input.companion.skillIds.length !== input.methods.length || input.methods.some(method => !input.companion.skillIds.includes(method.entryId) ||
      (!confirmed(method) && !isCompanionCaseMethod(input.companion, method))))
      throw new Error('已添加的教学方法需要先核对并由教师确认。');
    const issue = companionIssue(input.companion, input.methods.map(method => ({ id: method.entryId })));
    if (issue) throw new Error(issue);
    return { id: crypto.randomUUID(), ownerId, companion: { ...input.companion,
      materials: input.companion.materials.map(item => ({ ...item, data: '' })) }, methods: input.methods,
      verifications: input.methods.flatMap(method => confirmed(method)
        ? [proofs.find(proof => proof.entryId === method.entryId && compileSkillInstructions(proof.skill) === compileSkillInstructions(method.skill))!.detectionId] : []),
      model: previewModel, purpose, status: 'open', createdAt: new Date(clock()).toISOString(), expiresAt: new Date(clock() + input.hours * 3600000).toISOString(), capacity: 1 };
  }
  return async function request<T>(path: string, body?: unknown, commitMethod?: (method: TeachingMethod) => boolean): Promise<T> {
    const url = new URL(path, 'https://browser.invalid'), parts = url.pathname.split('/').filter(Boolean);
    const data = read(); advance(data);
    let result: unknown;
    if (parts[0] === 'verified' && body === undefined) result = proofList(data);
    else if (parts[0] === 'method-chats' && parts.length === 1) {
      if (body === undefined) result = data.methodChats.filter(chat => !url.searchParams.get('entryId') || chat.method.entryId === url.searchParams.get('entryId'));
      else {
        const input = methodChatRecordSchema.parse(body);
        if (input.fingerprint !== methodMarkdown(input.method.skill) || !completeChat(input.messages)) throw new Error('对话与当前方法不匹配，请重新开始。');
        const previous = data.methodChats.find(chat => chat.id === input.id);
        if (previous && (previous.method.entryId !== input.method.entryId || previous.fingerprint !== input.fingerprint)) throw new Error('方法已修改，请开始新的对话。');
        const saved = { ...input, confirmedAt: undefined, updatedAt: new Date(clock()).toISOString() };
        data.methodChats = [saved, ...data.methodChats.filter(chat => chat.id !== saved.id)]; save(data); result = saved;
      }
    } else if (parts[0] === 'method-chats' && parts[2] === 'confirm') {
      const input = z.object({ fingerprint: z.string(), teacherConfirmed: z.literal(true) }).parse(body);
      const chat = data.methodChats.find(chat => chat.id === parts[1]);
      if (!chat || chat.fingerprint !== input.fingerprint || chat.fingerprint !== methodMarkdown(chat.method.skill) || !completeChat(chat.messages)) throw new Error('没有可确认的当前方法对话，请先发送消息。');
      chat.confirmedAt = new Date(clock()).toISOString(); save(data); result = chat;
    }
    else if (parts[0] === 'detections' && parts.length === 1) {
      if (body === undefined) result = data.detections.map(item => item.value).filter(item => !url.searchParams.get('entryId') || item.method.entryId === url.searchParams.get('entryId'));
      else {
        const method = methodInputSchema.parse(body);
        if (!method.skill.constraints.some(item => item.startsWith(boundaryPrefix) && item.slice(boundaryPrefix.length).trim()))
          throw new Error('请先补充教学方法的结束条件。');
        const prepared = previewCases(method), value: Detection = { id: crypto.randomUUID(), ownerId, method, model: previewModel,
          fingerprint: compileSkillInstructions(method.skill), status: 'running', cases: prepared.map(item => ({ ...item, messages: [], verdicts: [] })),
          error: '', createdAt: new Date(clock()).toISOString() };
        data.detections = [{ value, prepared }, ...data.detections.filter(item => item.value.method.entryId !== method.entryId)];
        save(data); result = value;
      }
    } else if (parts[0] === 'detections' && parts[1]) {
      const item = data.detections.find(item => item.value.id === parts[1]); if (!item) throw new Error('没有找到这项方法的核对记录。');
      if (['view-case', 'confirm-case', 'revise-case'].includes(parts[2]) && body !== undefined) {
        const { next, method } = updateCaseReview(item.value, parts[2], body);
        if (method && !commitMethod) throw new Error('这项方法是只读内容，不能修改。');
        const previous = JSON.stringify(data);
        item.value = next;
        if (method) item.prepared = next.cases;
        if (reviewProgress(next).confirmed === next.cases.length) {
          next.status = 'verified'; next.confirmedAt ||= new Date(clock()).toISOString();
        }
        // 先写核对记录，再提交原方法；原方法保存失败时恢复记录，避免只改动一边。
        save(data);
        if (method) {
          let committed = false;
          try { committed = commitMethod!(method); } catch { /* 原方法未保存，恢复核对记录。 */ }
          if (!committed) {
            try { storage.setItem(key, previous); }
            catch { throw new Error('方法未保存，核对记录未能恢复。请恢复存储后重新检测。'); }
            throw new Error('方法未保存，原方法和核对进度已保留。请释放存储空间后重试。');
          }
        }
      } else if (parts[2] === 'confirm' && body !== undefined) {
        if (item.value.status !== 'review') throw new Error('请先完成情境准备，再核对回复。');
        if (reviewProgress(item.value).confirmed !== item.value.cases.length) throw new Error('请逐个确认所有情况。');
        item.value.status = 'verified'; item.value.confirmedAt = new Date(clock()).toISOString(); save(data);
      }
      result = item.value;
    } else if (parts[0] === 'trials' && parts.length === 1) {
      if (body === undefined) result = data.trials.filter(item => (!url.searchParams.get('companionId') || item.companion.id === url.searchParams.get('companionId')) && (!url.searchParams.get('purpose') || purposeOf(data, item) === url.searchParams.get('purpose')));
      else {
        const trial = prepareTrial(data, body);
        for (const previous of data.trials) if (previous.companion.id === trial.companion.id && previous.status === 'open' && purposeOf(data, previous) === 'run') previous.status = 'closed';
        data.trials.unshift(trial); save(data); result = { trial };
      }
    } else if (parts[0] === 'practice-trials' && parts.length === 1 && body !== undefined) {
      // preview 学伴试运行：试运行与教师会话在同一次 save 内落盘，避免两段保存中途失败留下不一致状态。
      const trial = prepareTrial(data, body, 'practice');
      for (const previous of data.trials) if (previous.companion.id === trial.companion.id && previous.status === 'open' && purposeOf(data, previous) === 'practice') previous.status = 'closed';
      const session: TrialSession = { id: crypto.randomUUID(), trialId: trial.id, audience: 'teacher', name: '教师试运行', messages: [],
        pending: false, error: '', createdAt: new Date(clock()).toISOString() };
      data.trials.unshift(trial); data.sessions.push(session); save(data); result = { trial, session };
    } else if (parts[0] === 'trials' && parts[1]) {
      const trial = trialOf(data, parts[1]);
      if (parts[2] === 'teacher-session' && body !== undefined) {
        requireOpen(trial);
        let session = data.sessions.find(item => item.trialId === trial.id);
        if (!session) { session = { id: crypto.randomUUID(), trialId: trial.id, audience: 'teacher', name: '教师试运行', messages: [],
          pending: false, error: '', createdAt: new Date(clock()).toISOString() }; data.sessions.push(session); save(data); }
        result = session;
      } else if (parts[2] === 'stop' && body !== undefined) { trial.status = 'closed'; save(data); result = trial; }
      else if (parts.length === 2 && body === undefined) result = { trial, sessions: data.sessions.filter(item => item.trialId === trial.id), reports: [] };
      else throw new Error('该入口暂不可用，请返回学伴试运行。');
    } else if (parts[0] === 'sessions' && ['turn', 'practice-turn'].includes(parts[2])) {
      const practice = parts[2] === 'practice-turn';
      const input = z.object({ content: z.string().trim().min(1).max(2000), requestId: z.uuid(), entryId: z.string().default(''), caseId: z.string().default('') }).parse(body);
      if (practice && (input.entryId || input.caseId)) throw new Error('学伴试运行根据学生表达使用方法，无需指定步骤。');
      const session = data.sessions.find(item => item.id === parts[1]); if (!session) throw new Error('没有找到本次对话。');
      requireOpen(trialOf(data, session.trialId));
      const method = trialOf(data, session.trialId).methods.find(item => item.entryId === input.entryId);
      if (!practice && !method) throw new Error('请选择本次使用的教学方法。');
      const chosen = method && previewCases(method).find(item => item.id === input.caseId);
      if (!practice && !chosen) throw new Error('教学情境已变化，请重新选择。');
      const receipt = data.requests.find(item => item.sessionId === session.id && item.requestId === input.requestId);
      if (receipt) {
        if (session.messages.find(message => message.id === receipt.userId)?.content !== input.content ||
          receipt.entryId !== input.entryId || receipt.caseId !== input.caseId) throw new Error('请求内容已变化，请重新发送。');
        result = session;
      } else if (session.requestId === input.requestId) {
        const activation = session.messages.at(-1)?.activations[0];
        if (session.messages.at(-2)?.content !== input.content || activation?.entryId !== input.entryId ||
          activation.step !== chosen?.target || activation.ended !== (chosen?.kind === 'ending')) throw new Error('请求内容已变化，请重新发送。');
        result = session;
      } else {
        if (session.messages.length >= 40 || session.messages.reduce((n, item) => n + item.content.length, 0) + input.content.length > 20000)
          throw new Error('本次对话较长，请开始新的试运行。');
        const message = previewMessage('user', input.content);
        const reply = practice ? practiceReply(trialOf(data, session.trialId), message, session.messages) : previewReply(method!, input.caseId, message);
        session.messages.push(message, reply); session.requestId = input.requestId;
        data.requests.push({ sessionId: session.id, requestId: input.requestId, userId: message.id, replyId: reply.id, entryId: input.entryId, caseId: input.caseId });
        save(data); result = session;
      }
    } else throw new Error('该入口暂不可用，请返回师说。');
    return structuredClone(result) as T;
  };
}
export async function browserPreviewApi<T>(path: string, body?: unknown, commitMethod?: (method: TeachingMethod) => boolean): Promise<T> {
  const account = readAccountSession(localStorage, sessionStorage);
  if (!account) throw new Error('登录已失效，请重新登录。');
  return createPreviewRuntime(localStorage, account.id)<T>(path, body, commitMethod);
}
