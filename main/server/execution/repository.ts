import { createHash, randomBytes } from 'node:crypto';
import { db } from '../store';
import type { Detection, Trial, TrialReport, TrialSession } from '../../shared/execution';

type Records = { detection: Detection; trial: Trial; session: TrialSession; report: TrialReport };
db.exec(`CREATE TABLE IF NOT EXISTS execution_records (
  id TEXT PRIMARY KEY, kind TEXT NOT NULL, owner_id TEXT NOT NULL, parent_id TEXT NOT NULL,
  payload TEXT NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS execution_owner ON execution_records(owner_id,kind,parent_id);
CREATE TABLE IF NOT EXISTS execution_capabilities (
  digest TEXT PRIMARY KEY, kind TEXT NOT NULL, record_id TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS execution_joins (
  trial_id TEXT NOT NULL, request_id TEXT NOT NULL, session_id TEXT NOT NULL, PRIMARY KEY(trial_id,request_id)
);`);
export class ExecutionError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function digest(value: string) { return createHash('sha256').update(value).digest('hex'); }
export function save<K extends keyof Records>(kind: K, ownerId: string, record: Records[K], parentId = '') {
  db.prepare(`INSERT INTO execution_records VALUES(?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at`).run(
    record.id, kind, ownerId, parentId, JSON.stringify(record), Date.now());
  return record;
}
export function get<K extends keyof Records>(kind: K, id: string, ownerId?: string): Records[K] {
  const row = db.prepare('SELECT owner_id,payload FROM execution_records WHERE kind=? AND id=?').get(kind, id) as
    { owner_id: string; payload: string } | undefined;
  if (!row || (ownerId !== undefined && row.owner_id !== ownerId)) throw new ExecutionError('没有找到这份记录。', 404);
  return JSON.parse(row.payload) as Records[K];
}
export function list<K extends keyof Records>(kind: K, ownerId: string, parentId?: string): Records[K][] {
  const rows = parentId === undefined
    ? db.prepare('SELECT payload FROM execution_records WHERE kind=? AND owner_id=? ORDER BY updated_at DESC').all(kind, ownerId)
    : db.prepare('SELECT payload FROM execution_records WHERE kind=? AND owner_id=? AND parent_id=? ORDER BY updated_at DESC').all(kind, ownerId, parentId);
  return (rows as { payload: string }[]).map(row => JSON.parse(row.payload) as Records[K]);
}
export function capability(kind: 'invitation' | 'student', recordId: string) {
  const token = randomBytes(32).toString('base64url');
  db.prepare('INSERT INTO execution_capabilities VALUES(?,?,?)').run(digest(token), kind, recordId);
  return token;
}
export function resolveCapability(kind: 'invitation' | 'student', token: string) {
  const row = db.prepare('SELECT record_id FROM execution_capabilities WHERE digest=? AND kind=?').get(digest(token), kind) as { record_id: string } | undefined;
  if (!row) throw new ExecutionError('试用凭据无效或已撤销。', 403);
  return row.record_id;
}
export function transaction<T>(work: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try { const result = work(); db.exec('COMMIT'); return result; }
  catch (error) { db.exec('ROLLBACK'); throw error; }
}
// 重启后不把中断的模型请求当作完成，保留已经取得的回复。
for (const row of db.prepare("SELECT id,kind,owner_id,parent_id,payload FROM execution_records WHERE kind IN ('detection','session','report')").all() as
  { id: string; kind: 'detection' | 'session' | 'report'; owner_id: string; parent_id: string; payload: string }[]) {
  const record = JSON.parse(row.payload) as Detection | TrialSession | TrialReport;
  if ('status' in record && record.status === 'running') {
    record.status = 'failed'; record.error = '服务重启导致任务中断，请重新执行。';
    save(row.kind === 'report' ? 'report' : 'detection', row.owner_id, record, row.parent_id);
  } else if ('pending' in record && record.pending) {
    record.pending = false; record.error = '请求因服务重启中断，请重新发送。';
    const message = record.messages.at(-1);
    if (message) record.failures = [...(record.failures || []), { messageId: message.id, at: new Date().toISOString(), error: record.error }];
    save('session', row.owner_id, record, row.parent_id);
  }
}
