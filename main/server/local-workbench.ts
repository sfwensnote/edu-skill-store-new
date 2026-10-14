import express from 'express';
import path from 'node:path';
import { methodChatRouter } from './method-chat';

const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  const loopback = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress || '');
  if (!loopback) { res.status(403).send('请通过已配置的公网入口访问。'); return; }
  if (req.method !== 'GET' && req.headers.origin && ![`http://${req.headers.host}`, `https://${req.headers.host}`].includes(req.headers.origin)) {
    res.status(403).json({ error: '请从当前工作台发起对话。' }); return;
  }
  res.locals.workspaceAuthorized = true;
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});
app.use(express.json({ limit: '256kb' }));
app.use('/api/method-chat', methodChatRouter);
app.use('/api', (_req, res) => res.status(404).json({ error: '此本机工作台仅开放教学方法对话服务。' }));
app.use(express.static(path.resolve('dist')));
app.get('/{*path}', (_req, res) => res.sendFile(path.resolve('dist/index.html')));
app.use((_error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => res.status(400).json({ error: '请求内容无法读取，请缩短后重试。' }));
const port = Number(process.env.WORKBENCH_PORT || 5173);
app.listen(port, '127.0.0.1', () => console.log(`师说本机工作台已启动：http://127.0.0.1:${port}/#/home`));
