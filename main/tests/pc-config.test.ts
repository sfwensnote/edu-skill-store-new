import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { parse } from 'dotenv';
import { configurePc, pcEnvironment, savePrivateConfig, validateLiveSettings } from '../scripts/pc-config';

test('本机配置保留现有教师数据库路径、模型凭据与无关设置，修正静态 Pages 配置', () => {
  const previous = `# 原配置\nDATABASE_PATH='C:\\教师项目\\new data\\workspace.sqlite'\nDESIGN_MODEL_URL=https://example.org/v1\nDESIGN_MODEL_NAME=existing-design\nDESIGN_MODEL_KEY=existing-private-key\nALLOW_REGISTRATION=false\nVITE_API_BASE_URL=https://old-backend.example.org\n`;
  const next = configurePc(previous, 'isolated-teaching-key'), values = parse(next);
  assert.equal(values.DATABASE_PATH, 'C:\\教师项目\\new data\\workspace.sqlite');
  assert.equal(values.DESIGN_MODEL_KEY, 'existing-private-key');
  assert.equal(values.DESIGN_MODEL_NAME, 'existing-design');
  assert.equal(values.DESIGN_MODEL_URL, 'https://example.org/v1');
  assert.equal(values.TEACHING_MODEL_KEY, 'isolated-teaching-key');
  assert.equal(values.ALLOW_REGISTRATION, 'false');
  assert.equal(values.VITE_API_BASE_URL, '');
  assert.equal(values.VITE_SERVICE_MODE, 'server');
  assert.equal(values.HOST, '127.0.0.1');
  assert.equal(values.ENABLE_LEGACY_SEED, 'false');
  assert.ok(next.startsWith('# 原配置\n'));
  assert.equal(configurePc(next, ''), next);
  assert.equal(pcEnvironment('HOST=0.0.0.0').HOST, '127.0.0.1');
  assert.equal(pcEnvironment('', true).HOST, '0.0.0.0');
});
test('缺少凭据、非法端口和未许可 HTTP 中转不能启动真实服务', () => {
  assert.throws(() => configurePc('', ''), /配置不完整/);
  assert.throws(() => configurePc('', 'key\nVITE_LEAK=secret'), /换行/);
  const ready = parse(configurePc('', 'isolated-teaching-key'));
  assert.equal(validateLiveSettings(ready), 5173);
  assert.throws(() => validateLiveSettings({ ...ready, PORT: '0' }), /PORT/);
  assert.throws(() => validateLiveSettings({ ...ready, ALLOW_INSECURE_MODEL_HTTP: 'false' }), /HTTP/);
  assert.throws(() => validateLiveSettings({ ...ready, DESIGN_MODEL_URL: 'file:///tmp/model' }), /HTTP/);
});
test('私有配置替换失败保留原文件；成功保存不遗留临时文件', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'pc-config-'));
  try {
    const file = path.join(directory, '.env');
    await savePrivateConfig(file, 'ORIGINAL=preserved\n');
    await assert.rejects(savePrivateConfig(path.join(directory, 'missing', '.env'), 'SECRET=fixture\n'));
    assert.equal(await readFile(file, 'utf8'), 'ORIGINAL=preserved\n');
    await savePrivateConfig(file, 'UPDATED=preserved\n');
    assert.equal(await readFile(file, 'utf8'), 'UPDATED=preserved\n');
    if (process.platform !== 'win32') assert.equal((await stat(file)).mode & 0o777, 0o600);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
