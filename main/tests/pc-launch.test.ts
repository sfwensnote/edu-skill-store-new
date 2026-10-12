import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { appRoot } from '../scripts/pc-config';

test('本机启动强制同源根路径，真实账号刷新与重启保留，模型凭据不会进入网页', { timeout: 150000 }, async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'pc-launch-'));
  const key = 'isolated-pc-protocol-key';
  let modelCalls = 0;
  const model = createServer(async (req, res) => {
    let content = '';
    for await (const chunk of req) content += chunk;
    if (req.url !== '/v1/chat/completions' || req.headers.authorization !== `Bearer ${key}`) { res.writeHead(401).end(); return; }
    const body = JSON.parse(content);
    assert.equal(body.model, 'isolated-pc-model');
    modelCalls++;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ choices: [{ message: { content: '连接正常。' } }] }));
  });
  await new Promise<void>(resolve => model.listen(0, '127.0.0.1', resolve));
  const modelPort = (model.address() as { port: number }).port;
  const probe = createServer();
  await new Promise<void>(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = (probe.address() as { port: number }).port;
  await new Promise<void>(resolve => probe.close(() => resolve()));
  const env = { ...process.env, PORT: String(port), DATABASE_PATH: path.join(directory, 'workspace.sqlite'),
    DESIGN_MODEL_URL: `http://127.0.0.1:${modelPort}/v1`, TEACHING_MODEL_URL: `http://127.0.0.1:${modelPort}/v1`,
    DESIGN_MODEL_NAME: 'isolated-pc-model', TEACHING_MODEL_NAME: 'isolated-pc-model',
    DESIGN_MODEL_KEY: key, TEACHING_MODEL_KEY: key, ALLOW_INSECURE_MODEL_HTTP: 'true',
    ALLOW_REGISTRATION: 'true', ENABLE_LEGACY_SEED: 'false',
    VITE_API_BASE_URL: 'https://should-not-be-used.invalid', VITE_SERVICE_MODE: 'demo',
    npm_execpath: path.join(appRoot, 'node_modules/npm/bin/npm-cli.js'),
  };
  // npm run 会提供自身 CLI 路径；直接 node --test 时使用系统 npm 的入口。
  env.npm_execpath = process.env.npm_execpath || (process.platform === 'win32'
    ? path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js')
    : process.execPath.replace(/\/bin\/node$/, '/lib/node_modules/npm/bin/npm-cli.js'));
  let child: ChildProcess | undefined, output = '';
  const start = (script: string) => {
    const running = spawn(process.execPath, script.endsWith('.mjs') ? [script] : ['--import', 'tsx', script], { cwd: appRoot, env, stdio: ['ignore', 'pipe', 'pipe'] });
    running.stdout?.on('data', chunk => { output += String(chunk); });
    running.stderr?.on('data', chunk => { output += String(chunk); });
    return running;
  };
  const stop = async () => {
    if (child && child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit'); child.kill('SIGTERM'); await exited;
    }
  };
  const base = `http://127.0.0.1:${port}`;
  try {
    child = start('scripts/pc-check.ts');
    assert.equal((await once(child, 'exit'))[0], 0, output);
    assert.equal(modelCalls, 1);
    child = start('scripts/pc-start.ts');
    const deadline = Date.now() + 90000;
    let ready = false;
    while (Date.now() < deadline && child.exitCode === null) {
      try { if ((await fetch(`${base}/api/status`)).ok) { ready = true; break; } } catch { /* 构建与启动期间等待 */ }
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    assert.ok(ready, output);
    const html = await (await fetch(base)).text();
    const asset = html.match(/src="([^" ]+\/assets\/[^" ]+\.js)"/)?.[1] || html.match(/src="(\/assets\/[^" ]+\.js)"/)?.[1];
    assert.ok(asset?.startsWith('/assets/'), html);
    const bundle = await (await fetch(`${base}${asset}`)).text();
    assert.ok(!bundle.includes(key));
    assert.ok(!bundle.includes('should-not-be-used.invalid'));
    const loginBody = { login: 'pc-teacher', name: '本机验收教师', password: 'IsolatedPcPassword2026!', transport: 'bearer' };
    const registered = await fetch(`${base}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(loginBody) });
    assert.equal(registered.status, 200);
    const { token } = await registered.json();
    const current = await fetch(`${base}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal((await current.json()).user.name, '本机验收教师');
    await stop();
    // 直接调用已构建的生产入口，避免重复构建；使用同一隔离数据库。
    child = start('scripts/start.mjs');
    const restartDeadline = Date.now() + 20000;
    while (Date.now() < restartDeadline && child.exitCode === null) {
      try { if ((await fetch(`${base}/api/status`)).ok) break; } catch { /* 重启期间等待 */ }
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(loginBody) });
    assert.equal(login.status, 200);
    assert.equal((await login.json()).user.name, '本机验收教师');
    assert.ok(!output.includes(key));
  } finally {
    await stop();
    await new Promise<void>(resolve => model.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  }
});
