import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { initialMine } from '../src/data/platform';

async function listen(server: Server) {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}
async function close(server?: Server) {
  if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

test('后台隔离检查：请求校验、认证、资料归属、材料与挂载模型协议', async (t) => {
  const directory = mkdtempSync(path.join(tmpdir(), 'skill-api-audit-'));
  const keys = ['DATABASE_PATH', 'DESIGN_MODEL_URL', 'DESIGN_MODEL_NAME', 'DESIGN_MODEL_KEY',
    'TEACHING_MODEL_URL', 'TEACHING_MODEL_NAME', 'TEACHING_MODEL_KEY'];
  const previous = keys.map((key) => process.env[key]);
  keys.slice(1).forEach((key) => { process.env[key] = ''; });
  process.env.DATABASE_PATH = path.join(directory, 'nested', 'test.sqlite');
  let api: Server | undefined, model: Server | undefined;
  let database: { close(): void } | undefined;
  try {
    const { createApp } = await import('../server/app');
    database = (await import('../server/store')).db;
    api = createServer(createApp());
    const root = await listen(api);
    const json = (value: unknown) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) });
    await t.test('无效 JSON、过长请求、跨源与空评审返回可读错误', async () => {
      const malformed = await fetch(`${root}/api/evaluate`, { ...json({}), body: '{' });
      assert.equal(malformed.status, 400);
      assert.match((await malformed.json()).error, /格式不正确/);
      assert.equal((await fetch(`${root}/api/evaluate`, json({ agent: null }))).status, 400);
      assert.equal((await fetch(`${root}/api/skills/preview`, { ...json({}), headers: { ...json({}).headers, Origin: 'https://foreign.example' } })).status, 403);
      assert.equal((await fetch(`${root}/api/design`, json({ demand: '字'.repeat(800000) }))).status, 413);
      assert.equal((await fetch(`${root}/api/missing`)).status, 404);
    });
    await t.test('账户密码、会话和项目隔离；其他账户不能读取或删除', async () => {
      assert.equal((await fetch(`${root}/api/projects`)).status, 401);
      const login = async (email: string) => {
        const response = await fetch(`${root}/api/auth/register`, json({ email, password: 'fixture-password', name: '检查教师' }));
        assert.equal(response.status, 200);
        assert.match(response.headers.get('set-cookie') || '', /HttpOnly.*SameSite=Strict/i);
        return response.headers.get('set-cookie')!.split(';')[0];
      };
      const teacherA = await login('a@example.test'), teacherB = await login('b@example.test');
      assert.equal((await fetch(`${root}/api/auth/login`, json({ email: ' A@EXAMPLE.TEST ', password: 'fixture-password' }))).status, 200);
      assert.equal((await fetch(`${root}/api/auth/login`, json({ email: 'a@example.test', password: 'wrong-password' }))).status, 401);
      const id = randomUUID();
      const payload = { id, name: '教学资料', updatedAt: new Date().toISOString(), note: '隔离资料' };
      const put = (body: unknown) => ({ ...json(body), method: 'PUT', headers: { ...json(body).headers, Cookie: teacherA } });
      assert.equal((await fetch(`${root}/api/projects/${id}`, put({ ...payload, updatedAt: '错误日期' }))).status, 400);
      assert.equal((await fetch(`${root}/api/projects/${randomUUID()}`, put(payload))).status, 400);
      assert.equal((await fetch(`${root}/api/projects/${id}`, put(payload))).status, 200);
      const projects = async (cookie: string) => (await fetch(`${root}/api/projects`, { headers: { Cookie: cookie } })).json();
      assert.deepEqual(await projects(teacherB), []);
      assert.equal((await projects(teacherA))[0].note, '隔离资料');
      assert.equal((await fetch(`${root}/api/projects/${id}`, { method: 'DELETE', headers: { Cookie: teacherB } })).status, 404);
      assert.equal((await projects(teacherA)).length, 1);
      await fetch(`${root}/api/auth/logout`, { method: 'POST', headers: { Cookie: teacherA } });
      assert.equal((await fetch(`${root}/api/projects`, { headers: { Cookie: teacherA } })).status, 401);
    });
    await t.test('材料读取、无文件及类型限制', async () => {
      assert.equal((await fetch(`${root}/api/materials`, { method: 'POST' })).status, 400);
      const upload = async (name: string, content: string) => {
        const form = new FormData(); form.set('file', new Blob([content]), name);
        return fetch(`${root}/api/materials`, { method: 'POST', body: form });
      };
      const response = await upload('teaching.txt', '这是隔离检查使用的课堂阅读材料。');
      assert.equal(response.status, 200);
      assert.equal((await response.json()).text, '这是隔离检查使用的课堂阅读材料。');
      assert.equal((await upload('file.exe', '不支持的文件内容')).status, 400);
      assert.equal((await upload('file.txt', '过短')).status, 400);
      const oversized = new FormData(); oversized.set('file', new Blob([new Uint8Array(5 * 1024 * 1024 + 1)]), 'large.txt');
      assert.equal((await fetch(`${root}/api/materials`, { method: 'POST', body: oversized })).status, 400);
    });
    await t.test('Demo 回复与真实协议夹具挂载完整 SKILL；模型失败不冒充成功', async () => {
      const skill = { ...initialMine[0].skills[0], constraints: ['必须先询问原文证据'],
        steps: [{ condition: '学生只有观点', action: '追问依据' }] };
      const request = { skill, caseId: `${skill.id}:0`, messages: [{ role: 'user', content: '我认为他很勇敢' }] };
      const demo = await (await fetch(`${root}/api/skills/preview`, json(request))).json();
      assert.equal(demo.mode, 'demo'); assert.match(demo.content, /依据/);
      assert.equal((await fetch(`${root}/api/skills/preview`, json({ ...request, caseId: `${skill.id}:99` }))).status, 400);
      let received: { model: string; messages: { role: string; content: string }[] } | undefined;
      let reject = false;
      model = createServer(async (req, res) => {
        if (reject) { res.writeHead(503).end(); return; }
        const parts: Buffer[] = []; for await (const chunk of req) parts.push(Buffer.from(chunk));
        received = JSON.parse(Buffer.concat(parts).toString());
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ choices: [{ message: { content: '原文中哪句话支持你的看法？' } }] }));
      });
      process.env.TEACHING_MODEL_URL = `${await listen(model)}/v1`;
      process.env.TEACHING_MODEL_NAME = 'local-protocol-fixture';
      const login = await fetch(`${root}/api/auth/login`, json({ email: 'a@example.test', password: 'fixture-password' }));
      const credential = login.headers.get('set-cookie')!.split(';')[0];
      const authorized = { ...json(request), headers: { ...json(request).headers, Cookie: credential } };
      assert.equal((await fetch(`${root}/api/skills/preview`, json(request))).status, 401);
      const live = await (await fetch(`${root}/api/skills/preview`, authorized)).json();
      assert.equal(live.mode, 'live'); assert.equal(live.content, '原文中哪句话支持你的看法？');
      assert.equal(received!.model, 'local-protocol-fixture');
      for (const text of [skill.name, skill.purpose, skill.trigger, skill.constraints[0], skill.steps[0].action])
        assert.ok(received!.messages[0].content.includes(text));
      assert.deepEqual(received!.messages.slice(1), request.messages);
      reject = true;
      const failed = await fetch(`${root}/api/skills/preview`, authorized);
      assert.equal(failed.status, 500); assert.match((await failed.json()).error, /HTTP 503/);
    });
  } finally {
    await close(api); await close(model); database?.close();
    keys.forEach((key, index) => {
      if (previous[index] === undefined) delete process.env[key]; else process.env[key] = previous[index];
    });
    rmSync(directory, { recursive: true, force: true });
  }
});
