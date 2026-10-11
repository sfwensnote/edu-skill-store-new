import { randomUUID } from 'node:crypto';
import { trialInputSchema, type Trial, type TrialSession } from '../../shared/execution';
import { companionContext, companionIssue, type CompanionMaterial } from '../../shared/learning-companion';
import { readMaterial } from '../materials';
import { db } from '../store';
import { requireVerified } from './detection';
import { capability, ExecutionError, get, list, resolveCapability, save, transaction } from './repository';
import { execute, modelIdentity, recorded, safeFailure } from './runtime';

async function parseMaterials(materials: CompanionMaterial[]) {
  if (materials.length > 10 || materials.reduce((n, item) => n + item.size, 0) > 3 * 1024 * 1024)
    throw new ExecutionError('教学材料合计最多 3 MB，最多10份。');
  return Promise.all(materials.map(async item => {
    const encoded = item.data.match(/^data:[^,]*;base64,([A-Za-z0-9+/=\r\n]+)$/)?.[1];
    if (!encoded) throw new ExecutionError('教学材料无法读取，请重新上传。');
    const bytes = Buffer.from(encoded, 'base64');
    if (bytes.length !== item.size || bytes.length > 2 * 1024 * 1024) throw new ExecutionError('教学材料大小不正确或超过 2 MB。');
    try { const parsed = await readMaterial(item.name, bytes); return { ...item, name: parsed.name, text: parsed.text, data: '' }; }
    catch (error) { throw new ExecutionError(error instanceof Error ? error.message : '教学材料无法读取。'); }
  }));
}
export async function createTrial(ownerId: string, input: unknown) {
  const { companion, methods, hours, capacity } = trialInputSchema.parse(input);
  const model = modelIdentity();
  const issue = companionIssue(companion, methods.map(method => ({ id: method.entryId, skill: method.skill })) as Parameters<typeof companionIssue>[1]);
  if (issue) throw new ExecutionError(issue);
  if (new Set(methods.map(item => item.entryId)).size !== methods.length ||
    companion.skillIds.length !== methods.length || methods.some(item => !companion.skillIds.includes(item.entryId)))
    throw new ExecutionError('挂载方法与学伴选择不一致。');
  if (JSON.stringify({ ...companion, materials: [], avatarImage: '' }).length > 18000 || companion.avatarImage.length > 1500000)
    throw new ExecutionError('学伴说明过长，请缩短后重试。');
  const verifications = requireVerified(ownerId, methods);
  if (list('trial', ownerId).filter(item => item.status === 'open' && Date.parse(item.expiresAt) > Date.now()).length >= 10)
    throw new ExecutionError('最多同时开放10次试用，请先结束已有试用。');
  const snapshot = { ...companion, materials: await parseMaterials(companion.materials) };
  if (context(snapshot, methods).length > 35000) throw new ExecutionError('材料正文与教学要求过长，请上传所需节选。');
  // 文件解析期间方法可能已经重检；再次核验，不能使用过期资格。
  requireVerified(ownerId, methods);
  const trial: Trial = { id: randomUUID(), ownerId, companion: snapshot, methods, verifications, model,
    status: 'open', capacity, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + hours * 3600000).toISOString() };
  return transaction(() => { save('trial', ownerId, trial, companion.id); return { trial, invitation: capability('invitation', trial.id) }; });
}
function context(companion: Trial['companion'], methods: Trial['methods']) {
  return companionContext(companion, methods.map(method => ({ id: method.entryId, skill: method.skill })) as Parameters<typeof companionContext>[1]);
}
export function activeTrial(trial: Trial) {
  if (trial.status !== 'open' || Date.parse(trial.expiresAt) <= Date.now()) throw new ExecutionError('本次试用已经结束或链接已失效。', 410);
  if (trial.model !== modelIdentity()) throw new ExecutionError('模型配置已改变，请教师重新检测并开启试用。', 409);
  const owner = db.prepare('SELECT disabled FROM users WHERE id=?').get(trial.ownerId) as { disabled: number } | undefined;
  if (!owner || owner.disabled) throw new ExecutionError('教师账号已停用，本次试用暂不可用。', 410);
}
export function trialInvitation(ownerId: string, trialId: string) {
  const trial = get('trial', trialId, ownerId); activeTrial(trial);
  return transaction(() => {
    db.prepare("DELETE FROM execution_capabilities WHERE kind='invitation' AND record_id=?").run(trialId);
    return { invitation: capability('invitation', trialId) };
  });
}
function newSession(trial: Trial, audience: TrialSession['audience'], name: string) {
  return save('session', trial.ownerId, { id: randomUUID(), trialId: trial.id, audience, name,
    messages: [], pending: false, error: '', createdAt: new Date().toISOString() }, trial.id);
}
export function joinTrial(invitation: string, name: string, existingToken?: string, requestId?: string) {
  const trial = get('trial', resolveCapability('invitation', invitation));
  activeTrial(trial);
  if (existingToken) {
    const session = get('session', resolveCapability('student', existingToken));
    if (session.trialId !== trial.id) throw new ExecutionError('试用凭据不属于此学伴。', 403);
    return { session, token: existingToken, companion: publicCompanion(trial) };
  }
  return transaction(() => {
    const prior = requestId && db.prepare('SELECT session_id FROM execution_joins WHERE trial_id=? AND request_id=?').get(trial.id, requestId) as { session_id: string } | undefined;
    if (prior) {
      const session = get('session', prior.session_id);
      if (session.name !== name) throw new ExecutionError('重复进入请求的昵称不一致。');
      db.prepare("DELETE FROM execution_capabilities WHERE kind='student' AND record_id=?").run(session.id);
      return { session, token: capability('student', session.id), companion: publicCompanion(trial) };
    }
    const count = list('session', trial.ownerId, trial.id).filter(item => item.audience === 'student').length;
    if (count >= trial.capacity) throw new ExecutionError('试用名额已满，请联系教师。', 409);
    const session = newSession(trial, 'student', name);
    if (requestId) db.prepare('INSERT INTO execution_joins VALUES(?,?,?)').run(trial.id, requestId, session.id);
    return { session, token: capability('student', session.id), companion: publicCompanion(trial) };
  });
}
export function publicCompanion(trial: Trial) {
  const { name, introduction, avatar, avatarImage, task } = trial.companion;
  return { name, introduction, avatar, avatarImage, task };
}
export function teacherSession(ownerId: string, trialId: string) {
  const trial = get('trial', trialId, ownerId); activeTrial(trial);
  return newSession(trial, 'teacher', '教师自行试用');
}
export function studentSession(token: string) {
  const session = get('session', resolveCapability('student', token));
  const trial = get('trial', session.trialId); activeTrial(trial);
  return { session, companion: publicCompanion(trial) };
}
export async function sendTurn(session: TrialSession, input: string, requestId: string) {
  const trial = get('trial', session.trialId); activeTrial(trial);
  if (session.requestId === requestId && !session.pending && !session.error) {
    if (session.messages.at(-2)?.content !== input) throw new ExecutionError('重复请求内容不一致。');
    return session;
  }
  if (session.pending) throw new ExecutionError('学伴正在回复，请稍候。', 409);
  if (session.messages.filter(item => item.role === 'assistant').length >= 30 ||
    session.messages.reduce((size, item) => size + item.content.length, input.length) > 24000)
    throw new ExecutionError('本次试用已达到对话长度限制，请联系教师。');
  if (session.requestId === requestId && session.messages.at(-1)?.content !== input) throw new ExecutionError('重复请求内容不一致。');
  if (!(session.requestId === requestId && session.messages.at(-1)?.role === 'user')) session.messages.push(recorded('user', input));
  session.pending = true; session.error = ''; session.requestId = requestId;
  save('session', trial.ownerId, session, trial.id);
  try {
    const reply = await execute(trial.methods, context(trial.companion, trial.methods), session.messages);
    // 教师停止后仍保留正在执行的实际回复，但不再允许新增请求。
    session.messages.push(reply);
  } catch (error) {
    session.error = safeFailure(error);
    session.failures = [...(session.failures || []), { messageId: session.messages.at(-1)!.id, at: new Date().toISOString(), error: session.error }];
  }
  session.pending = false;
  return save('session', trial.ownerId, session, trial.id);
}
export function closeTrial(ownerId: string, id: string, status: 'closed' | 'revoked') {
  const trial = get('trial', id, ownerId);
  if (trial.status === 'revoked' && status === 'closed') return trial;
  trial.status = status;
  return save('trial', ownerId, trial, trial.companion.id);
}
