import express from 'express';
import multer from 'multer';
import { z } from 'zod';
import { agentSchema, messageSchema } from '../shared/schema';
import { compileInstructions } from '../shared/domain';
import { demoReply } from '../shared/demo';
import { design, complete, modelStatus } from './models';
import { readMaterial } from './materials';
import { evaluate } from './evaluation';
import { authRouter, currentUser } from './auth';
import { db } from './store';
import { previewSkill } from './skill-preview';


export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '2mb' }));
  app.use('/api', (req, res, next) => {
    if (
      req.method !== 'GET' &&
      req.headers.origin &&
      req.headers.origin !== `http://${req.headers.host}` &&
      req.headers.origin !== `https://${req.headers.host}`
    ) {
      res.status(403).json({ error: '请从当前工作台发起操作。' });
      return;
    }
    next();
  });
  app.get('/api/status', (_req, res) => res.json(modelStatus()));
  app.use('/api/auth', authRouter);
  app.post('/api/skills/preview', async (req, res) => res.json(await previewSkill(req.body)));
  app.post('/api/design', async (req, res) => {
    const { demand } = z.object({ demand: z.string().trim().min(10).max(4000) }).parse(req.body);
    res.json(await design(demand));
  });
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
  app.post('/api/materials', upload.single('file'), async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: '请选择一份材料。' });
      return;
    }
    const name = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    try {
      res.json(await readMaterial(name, req.file.buffer));
    } catch (error) {
      res
        .status(400)
        .json({ error: error instanceof Error && /^(暂时支持|没有读取到|文件文字|这份材料)/.test(error.message)
          ? error.message : '文件读取失败，请换用可复制的文字材料。' });
    }
  });
  app.post('/api/chat', async (req, res) => {
    const { agent, messages } = z
      .object({ agent: agentSchema, messages: z.array(messageSchema).min(1).max(40) })
      .parse(req.body);
    if (messages.reduce((n, m) => n + m.content.length, 0) > 20000) {
      res.status(400).json({ error: '本次试用对话较长，请清空对话后重新试用。' });
      return;
    }
    const mode = modelStatus().mode;
    const content =
      mode === 'demo'
        ? demoReply(messages.at(-1)!.content, messages.filter((m) => m.role === 'assistant').length)
        : await complete('TEACHING', compileInstructions(agent), messages);
    res.json({ content, mode });
  });
  app.post('/api/evaluate', async (req, res) => {
    const { agent } = z.object({ agent: agentSchema }).parse(req.body);
    res.json(await evaluate(agent));
  });
  app.get('/api/projects', (req, res) => {
    const user = currentUser(req);
    if (!user) {
      res.status(401).json({ error: '请先登录后保存项目。' });
      return;
    }
    const rows = db
      .prepare('SELECT payload FROM projects WHERE user_id=? ORDER BY updated_at DESC')
      .all(user.id) as { payload: string }[];
    res.json(rows.map((row) => JSON.parse(row.payload)));
  });
  app.put('/api/projects/:id', (req, res) => {
    const user = currentUser(req);
    if (!user) {
      res.status(401).json({ error: '登录已失效，请重新登录。' });
      return;
    }
    const payload = z
      .object({ id: z.string().uuid(), name: z.string().trim().min(1).max(200), updatedAt: z.string().datetime({ offset: true }) })
      .passthrough()
      .parse(req.body);
    if (payload.id !== req.params.id) {
      res.status(400).json({ error: '项目编号不一致。' });
      return;
    }
    db.prepare(
      'INSERT INTO projects VALUES(?,?,?,?) ON CONFLICT(id,user_id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at',
    ).run(payload.id, user.id, JSON.stringify(payload), new Date().toISOString());
    res.json({ ok: true });
  });
  app.delete('/api/projects/:id', (req, res) => {
    const user = currentUser(req);
    if (!user) {
      res.status(401).json({ error: '登录已失效，请重新登录。' });
      return;
    }
    const result = db.prepare('DELETE FROM projects WHERE id=? AND user_id=?').run(req.params.id, user.id);
    if (!result.changes) {
      res.status(404).json({ error: '未找到这个项目，可能已被删除。' });
      return;
    }
    res.json({ ok: true });
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: '未找到这个接口。' }));
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const bodyError = error as { type?: string };
    if (bodyError?.type === 'entity.parse.failed') {
      res.status(400).json({ error: '请求格式不正确，请重新提交。' });
      return;
    }
    if (bodyError?.type === 'entity.too.large') {
      res.status(413).json({ error: '提交内容过长，请缩短后重试。' });
      return;
    }
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: '输入不完整或超过长度限制，请检查后重试。' });
      return;
    }
    if (error instanceof multer.MulterError) {
      res.status(400).json({ error: '文件超过 5MB 或格式不正确，请上传较小的材料。' });
      return;
    }
    const message = error instanceof Error ? error.message : '操作失败，请重试。';
    res.status(500).json({ error: /timeout|abort/i.test(message) ? '模型响应超时，请稍后重试。'
      : /^(模型|教学模型|设计模型)/.test(message) ? message : '操作失败，请稍后重试。' });
  });
  return app;
}
