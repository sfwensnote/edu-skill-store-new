import { Router, type Request } from 'express';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { db } from './store';

const account = z.object({
  email: z
    .string().trim().max(200).pipe(z.email())
    .transform((s) => s.toLowerCase()),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(1).max(50).optional(),
});
export function currentUser(req: Request): { id: string; email: string; name: string } | undefined {
  const token = req.headers.cookie
    ?.split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith('esb_session='))
    ?.slice(12);
  if (!token) return;
  return db
    .prepare(
      'SELECT users.id,users.email,users.name FROM users JOIN sessions ON users.id=sessions.user_id WHERE sessions.token=? AND sessions.expires>?',
    )
    .get(token, Date.now()) as ReturnType<typeof currentUser>;
}
export const authRouter = Router();
authRouter.get('/me', (req, res) => res.json({ user: currentUser(req) ?? null }));
// 本机 Demo 的轻量尝试限制，不引入额外缓存服务。
const attempts = new Map<string, { count: number; reset: number }>();
authRouter.post('/:action', (req, res) => {
  if (req.params.action === 'logout') {
    const token = req.headers.cookie
      ?.split(';')
      .map((s) => s.trim())
      .find((s) => s.startsWith('esb_session='))
      ?.slice(12);
    if (token) db.prepare('DELETE FROM sessions WHERE token=?').run(token);
    res.clearCookie('esb_session').json({ ok: true });
    return;
  }
  if (!['register', 'login'].includes(String(req.params.action))) {
    res.status(404).json({ error: '未找到此操作' });
    return;
  }
  const ip = req.ip || 'local';
  let bucket = attempts.get(ip);
  if (!bucket || bucket.reset < Date.now()) {
    bucket = { count: 0, reset: Date.now() + 60000 };
    attempts.set(ip, bucket);
  }
  if (++bucket.count > 30) {
    res.status(429).json({ error: '尝试较多，请一分钟后重试。' });
    return;
  }
  const { email, password, name } = account.parse(req.body);
  if (req.params.action === 'register') {
    if (db.prepare('SELECT id FROM users WHERE email=?').get(email)) {
      res.status(409).json({ error: '此邮箱已注册，请直接登录。' });
      return;
    }
    const salt = randomBytes(16).toString('hex');
    db.prepare('INSERT INTO users VALUES(?,?,?,?,?)').run(
      randomUUID(),
      email,
      name || '教师',
      scryptSync(password, salt, 64).toString('hex'),
      salt,
    );
  }
  const row = db.prepare('SELECT * FROM users WHERE email=?').get(email) as
    { id: string; email: string; name: string; hash: string; salt: string } | undefined;
  if (!row || !timingSafeEqual(Buffer.from(row.hash, 'hex'), scryptSync(password, row.salt, 64))) {
    res.status(401).json({ error: '邮箱或密码不正确。' });
    return;
  }
  const token = randomBytes(32).toString('hex');
  db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());
  db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(token, row.id, Date.now() + 7 * 86400000);
  res
    .cookie('esb_session', token, { httpOnly: true, sameSite: 'strict', maxAge: 7 * 86400000, path: '/' })
    .json({ user: { id: row.id, email: row.email, name: row.name } });
});
