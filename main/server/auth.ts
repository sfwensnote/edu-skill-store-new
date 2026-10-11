import { Router, type Request } from 'express';
import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { db } from './store';

const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
function requestToken(req: Request) {
  return req.headers.authorization?.match(/^Bearer ([A-Za-z0-9_-]{40,100})$/)?.[1] ||
    req.headers.cookie?.split(';').map(value => value.trim()).find(value => value.startsWith('esb_session='))?.slice(12);
}
export type ServerUser = { id: string; email: string; name: string; role: 'teacher' | 'admin'; disabled: number };
export function currentUser(req: Request): ServerUser | undefined {
  const token = requestToken(req);
  if (!token) return;
  return db.prepare(`SELECT users.id,users.email,users.name,users.role,users.disabled FROM users JOIN sessions
    ON users.id=sessions.user_id WHERE sessions.token IN (?,?) AND sessions.expires>? AND users.disabled=0`)
    .get(tokenHash(token), token, Date.now()) as ServerUser | undefined;
}
const account = z.object({
  email: z.string().trim().max(200).pipe(z.email()).optional(),
  login: z.string().trim().min(3).max(40).regex(/^[A-Za-z0-9_.@-]+$/).optional(),
  password: z.string().min(8).max(128), name: z.string().trim().min(1).max(50).optional(),
  transport: z.enum(['cookie', 'bearer']).optional(),
}).refine(value => value.email || value.login);
const identity = (user: ServerUser) => ({ id: user.id, email: user.email, login: user.email, name: user.name, role: user.role, disabled: Boolean(user.disabled) });
export const authRouter = Router();
authRouter.get('/me', (req, res) => { const user = currentUser(req); res.json({ user: user ? identity(user) : null }); });
authRouter.get('/accounts', (req, res) => {
  if (currentUser(req)?.role !== 'admin') { res.status(403).json({ error: '仅管理员可以管理账号。' }); return; }
  const users = db.prepare('SELECT id,email,name,role,disabled FROM users ORDER BY name').all() as ServerUser[];
  res.json(users.map(identity));
});
authRouter.patch('/accounts/:id', (req, res) => {
  if (currentUser(req)?.role !== 'admin') { res.status(403).json({ error: '仅管理员可以管理账号。' }); return; }
  const { disabled } = z.object({ disabled: z.boolean() }).parse(req.body);
  const changed = db.prepare("UPDATE users SET disabled=? WHERE id=? AND role='teacher'").run(disabled ? 1 : 0, req.params.id);
  if (!changed.changes) { res.status(404).json({ error: '没有找到教师账号。' }); return; }
  if (disabled) db.prepare('DELETE FROM sessions WHERE user_id=?').run(req.params.id);
  res.json({ ok: true });
});
const attempts = new Map<string, { count: number; reset: number }>();
authRouter.post('/:action', (req, res) => {
  if (req.params.action === 'logout') {
    const token = requestToken(req);
    if (token) db.prepare('DELETE FROM sessions WHERE token IN (?,?)').run(tokenHash(token), token);
    res.clearCookie('esb_session', { path: '/' }).json({ ok: true }); return;
  }
  if (!['register', 'login'].includes(String(req.params.action))) { res.status(404).json({ error: '未找到此操作。' }); return; }
  for (const [key, bucket] of attempts) if (bucket.reset < Date.now()) attempts.delete(key);
  const ip = req.ip || 'local';
  const bucket = attempts.get(ip) || { count: 0, reset: Date.now() + 60000 }; attempts.set(ip, bucket);
  if (++bucket.count > 30 || attempts.size > 20000) { res.status(429).json({ error: '尝试较多，请一分钟后重试。' }); return; }
  const input = account.parse(req.body), email = (input.login || input.email!).toLowerCase();
  if (req.params.action === 'register') {
    if (process.env.ALLOW_REGISTRATION === 'false') { res.status(403).json({ error: '教师注册暂未开放，请联系管理员。' }); return; }
    if (db.prepare('SELECT id FROM users WHERE email=?').get(email)) { res.status(409).json({ error: '此账号已注册，请直接登录。' }); return; }
    const salt = randomBytes(16).toString('hex');
    db.prepare('INSERT INTO users(id,email,name,hash,salt) VALUES(?,?,?,?,?)').run(randomUUID(), email, input.name || '教师', scryptSync(input.password, salt, 64).toString('hex'), salt);
  }
  const row = db.prepare('SELECT * FROM users WHERE email=?').get(email) as (ServerUser & { hash: string; salt: string }) | undefined;
  if (!row || row.disabled || !timingSafeEqual(Buffer.from(row.hash, 'hex'), scryptSync(input.password, row.salt, 64))) {
    res.status(401).json({ error: '账号或密码不正确，或账号已停用。' }); return;
  }
  const token = randomBytes(32).toString('base64url');
  db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());
  db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(tokenHash(token), row.id, Date.now() + 7 * 86400000);
  if (input.transport !== 'bearer') res.cookie('esb_session', token, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', maxAge: 7 * 86400000, path: '/' });
  res.json({ user: identity(row), ...(input.transport === 'bearer' ? { token } : {}) });
});
