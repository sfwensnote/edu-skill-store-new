import { Router } from 'express';
import { z } from 'zod';
import { currentUser } from '../auth';
import { closeTrial, createTrial, joinTrial, sendTurn, studentSession, teacherSession, trialInvitation } from './trials';
import { confirmDetection, startDetection, verifiedMethods } from './detection';
import { createReport, reviewReport } from './reports';
import { digest, ExecutionError, get, list } from './repository';
import { modelIdentity } from './runtime';

export const executionRouter = Router();
const buckets = new Map<string, { count: number; until: number }>();
executionRouter.use((req, res, next) => {
  if (req.method !== 'GET') {
    for (const [key, bucket] of buckets) if (bucket.until < Date.now()) buckets.delete(key);
    const studentCredential = req.path === '/public/turn' ? req.headers.authorization?.match(/^Bearer [A-Za-z0-9_-]{43}$/)?.[0] : undefined;
    const key = currentUser(req)?.id || (studentCredential ? digest(studentCredential) : req.ip || 'local');
    const bucket = buckets.get(key) || { count: 0, until: Date.now() + 60000 }; buckets.set(key, bucket);
    if (++bucket.count > 40 || buckets.size > 20000) { res.status(429).json({ error: '请求较多，请一分钟后重试。' }); return; }
  }
  next();
});
const studentToken = (authorization?: string) => z.string().regex(/^Bearer [A-Za-z0-9_-]{43}$/).parse(authorization).slice(7);
const turnSchema = z.object({ content: z.string().trim().min(1).max(2000), requestId: z.string().uuid() });
executionRouter.post('/public/join', (req, res) => {
  const { invitation, name, token, requestId } = z.object({ invitation: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
    name: z.string().trim().min(1).max(30), token: z.string().regex(/^[A-Za-z0-9_-]{43}$/).optional(), requestId: z.string().uuid().optional() }).parse(req.body);
  res.json(joinTrial(invitation, name, token, requestId));
});
executionRouter.get('/public/session', (req, res) => res.json(studentSession(studentToken(req.headers.authorization))));
executionRouter.post('/public/turn', async (req, res) => {
  const input = turnSchema.parse(req.body), { session } = studentSession(studentToken(req.headers.authorization));
  res.json(await sendTurn(session, input.content, input.requestId));
});
executionRouter.use((req, res, next) => {
  const user = currentUser(req);
  if (!user) { res.status(401).json({ error: '请登录教师账号。' }); return; }
  res.locals.ownerId = user.id; next();
});
executionRouter.get('/status', (_req, res) => {
  try { res.json({ ready: true, model: modelIdentity() }); }
  catch (error) { res.json({ ready: false, error: error instanceof ExecutionError ? error.message : '模型配置无效。' }); }
});
executionRouter.get('/detections', (req, res) => res.json(list('detection', res.locals.ownerId,
  typeof req.query.entryId === 'string' ? req.query.entryId : undefined)));
executionRouter.post('/detections', (req, res) => res.status(202).json(startDetection(res.locals.ownerId, req.body)));
executionRouter.get('/detections/:id', (req, res) => res.json(get('detection', String(req.params.id), res.locals.ownerId)));
executionRouter.post('/detections/:id/confirm', (req, res) => res.json(confirmDetection(res.locals.ownerId, String(req.params.id))));
executionRouter.get('/verified', (_req, res) => res.json(verifiedMethods(res.locals.ownerId)));
executionRouter.get('/trials', (req, res) => res.json(list('trial', res.locals.ownerId,
  typeof req.query.companionId === 'string' ? req.query.companionId : undefined)));
executionRouter.post('/trials', async (req, res) => res.status(201).json(await createTrial(res.locals.ownerId, req.body)));
executionRouter.get('/trials/:id', (req, res) => {
  const trial = get('trial', String(req.params.id), res.locals.ownerId);
  res.json({ trial, sessions: list('session', res.locals.ownerId, trial.id), reports: list('report', res.locals.ownerId, trial.id) });
});
executionRouter.post('/trials/:id/stop', (req, res) => res.json(closeTrial(res.locals.ownerId, String(req.params.id),
  z.object({ status: z.enum(['closed', 'revoked']) }).parse(req.body).status)));
executionRouter.post('/trials/:id/teacher-session', (req, res) => res.json(teacherSession(res.locals.ownerId, String(req.params.id))));
executionRouter.post('/trials/:id/invitation', (req, res) => res.json(trialInvitation(res.locals.ownerId, String(req.params.id))));
executionRouter.post('/sessions/:id/turn', async (req, res) => {
  const session = get('session', String(req.params.id), res.locals.ownerId);
  if (session.audience !== 'teacher') throw new ExecutionError('请使用学生的受控试用入口。', 403);
  const input = turnSchema.parse(req.body);
  res.json(await sendTurn(session, input.content, input.requestId));
});
executionRouter.post('/trials/:id/report', async (req, res) => res.json(await createReport(res.locals.ownerId, String(req.params.id))));
executionRouter.post('/reports/:id/review', (req, res) => res.json(reviewReport(res.locals.ownerId, String(req.params.id), req.body)));
executionRouter.use((error: unknown, _req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
  if (error instanceof ExecutionError) { res.status(error.status).json({ error: error.message }); return; }
  next(error);
});
