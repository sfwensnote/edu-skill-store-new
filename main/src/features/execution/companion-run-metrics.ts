import type { Activation, RecordedMessage, Trial, TrialSession } from '../../../shared/execution';

/** 一次运行的报告统计输入：一份运行快照与其下全部对话。 */
export type CompanionRunDetail = { trial: Trial; sessions: TrialSession[] };

export type CompanionRunStatus = 'running' | 'ended' | 'revoked' | 'expired';
export type CompanionRunMethodUsage = { entryId: string; name: string; count: number };
export type CompanionRunDurationPoint = { day: string; minutes: number };
export type CompanionRunRow = {
  sessionId: string; trialId: string; name: string; audience: 'teacher' | 'student';
  createdAt: string; messageCount: number; assistantTurns: number; activationCount: number;
  durationSeconds: number | null; status: CompanionRunStatus; endingObserved: boolean;
  messages: RecordedMessage[];
};
export type CompanionRunMetrics = {
  activationCount: number; assistantTurns: number; conversationCount: number;
  methodUsage: CompanionRunMethodUsage[]; durationTrend: CompanionRunDurationPoint[];
  rows: CompanionRunRow[];
};

const shanghaiDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
});

function parsedTime(at: string): number | null {
  const time = Date.parse(at);
  return Number.isFinite(time) ? time : null;
}

function shanghaiDate(time: number): string {
  return shanghaiDay.format(new Date(time));
}

function resolveStatus(trial: Trial, now: number): CompanionRunStatus {
  if (trial.status === 'closed') return 'ended';
  if (trial.status === 'revoked') return 'revoked';
  const expires = parsedTime(trial.expiresAt);
  if (expires !== null && now >= expires) return 'expired';
  return 'running';
}

function uniqueMessages(session: TrialSession): RecordedMessage[] {
  const seen = new Set<string>();
  const result: RecordedMessage[] = [];
  for (const message of session.messages ?? []) {
    if (!message || !isRecorded(message) || seen.has(message.id)) continue;
    seen.add(message.id);
    result.push(message);
  }
  return result;
}

/** 空占位消息不构成真实对话，只保留有实际内容的记录。 */
function isRecorded(message: RecordedMessage): boolean {
  return typeof message.content === 'string' && message.content.trim().length > 0;
}

/** 只有 assistant 消息携带的激活才算真实触发，避免 user 记录串入统计。 */
function assistantActivations(messages: RecordedMessage[]): Activation[] {
  return messages
    .filter(message => message.role === 'assistant')
    .flatMap(message => message.activations ?? []);
}

function spanSeconds(messages: RecordedMessage[]): number | null {
  const times = messages
    .map(message => parsedTime(message.at))
    .filter((time): time is number => time !== null);
  if (times.length < 2) return null;
  return Math.round((Math.max(...times) - Math.min(...times)) / 1000);
}

function buildRow(trial: Trial, session: TrialSession, now: number): CompanionRunRow {
  const messages = uniqueMessages(session);
  const activations = assistantActivations(messages);
  return {
    sessionId: session.id,
    trialId: trial.id,
    name: session.name,
    audience: session.audience,
    createdAt: session.createdAt,
    messageCount: messages.length,
    assistantTurns: messages.filter(message => message.role === 'assistant').length,
    activationCount: activations.length,
    durationSeconds: spanSeconds(messages),
    status: resolveStatus(trial, now),
    endingObserved: activations.some(activation => activation.ended === true),
    messages,
  };
}

function buildDurationTrend(rows: CompanionRunRow[]): CompanionRunDurationPoint[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    if (row.durationSeconds === null) continue;
    const start = row.messages
      .map(message => parsedTime(message.at))
      .filter((time): time is number => time !== null)
      .sort((a, b) => a - b)[0];
    if (start === undefined) continue;
    const day = shanghaiDate(start);
    totals.set(day, (totals.get(day) ?? 0) + row.durationSeconds);
  }
  return [...totals.entries()]
    .map(([day, seconds]) => ({ day, minutes: Math.round((seconds / 60) * 10) / 10 }))
    .sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
}

/**
 * 只根据实际记录的 assistant 激活与回复生成统计：不生成任务完成百分比、
 * 学习效果评分或学生人数，也不修改传入的运行快照。多个运行按 session ID
 * 去重，每个 session 只归属 trialId 相同的运行；空对话不进入 rows。
 */
export function buildRunMetrics(details: CompanionRunDetail[], now: number = Date.now()): CompanionRunMetrics {
  const nowTime = Number.isFinite(now) ? now : Date.now();
  const seenSessions = new Set<string>();
  const rows: CompanionRunRow[] = [];
  const usage = new Map<string, CompanionRunMethodUsage>();

  for (const detail of details ?? []) {
    const trial = detail?.trial;
    if (!trial) continue;
    const ownRows: CompanionRunRow[] = [];
    for (const session of detail.sessions ?? []) {
      if (!session || session.trialId !== trial.id || seenSessions.has(session.id)) continue;
      const row = buildRow(trial, session, nowTime);
      // 空对话不进入 rows；只有保留成行的会话才登记去重，避免空的重复项遮蔽后续真实对话。
      if (row.messageCount === 0) continue;
      seenSessions.add(session.id);
      ownRows.push(row);
    }
    const counts = new Map<string, number>();
    for (const row of ownRows) {
      for (const activation of assistantActivations(row.messages)) {
        counts.set(activation.entryId, (counts.get(activation.entryId) ?? 0) + 1);
      }
    }
    rows.push(...ownRows);
    for (const method of trial.methods ?? []) {
      // 零触发的快照方法保留；同 entryId 但名称不同的快照分开记录。
      const name = method.skill?.name ?? '';
      const key = `${method.entryId}\u0000${name}`;
      const record = usage.get(key) ?? { entryId: method.entryId, name, count: 0 };
      record.count += counts.get(method.entryId) ?? 0;
      usage.set(key, record);
    }
  }

  return {
    activationCount: rows.reduce((total, row) => total + row.activationCount, 0),
    assistantTurns: rows.reduce((total, row) => total + row.assistantTurns, 0),
    conversationCount: rows.length,
    methodUsage: [...usage.values()],
    durationTrend: buildDurationTrend(rows),
    rows,
  };
}
