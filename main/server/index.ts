import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'node:path';
import { createApp } from './app';
import { modelStatus } from './models';

const app = createApp();
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.resolve('dist')));
  app.get('/{*path}', (_req, res) => res.sendFile(path.resolve('dist/index.html')));
} else {
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
}
const port = Number(process.env.PORT || 5173);
const server = app.listen(port, '127.0.0.1', () => {
  const address = server.address();
  const actualPort = address && typeof address === 'object' ? address.port : port;
  console.log(`教学工坊：http://127.0.0.1:${actualPort}（${modelStatus().mode}）`);
});
