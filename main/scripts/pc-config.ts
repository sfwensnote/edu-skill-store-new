import { readFile, writeFile, rename, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';
import { parse } from 'dotenv';

export const appRoot = fileURLToPath(new URL('../', import.meta.url));
export const relayDefault = { url: 'http://123.60.51.11:3000/v1', name: 'deepseek-v4.1-flash' };
export type Environment = Record<string, string | undefined>;

export function assertNodeVersion() {
  if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('请先安装 Node.js 24 x64，再重新启动。');
}
export async function readPrivateConfig(file: string) {
  try { return await readFile(file, 'utf8'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return ''; throw new Error('无法读取本机配置，请检查文件权限。'); }
}
export function pcEnvironment(contents: string, lan = false): Environment {
  return { ...parse(contents), ...process.env, HOST: lan ? '0.0.0.0' : '127.0.0.1', VITE_SERVICE_MODE: 'server', VITE_API_BASE_URL: '' };
}
export function validateLiveSettings(env: Environment) {
  for (const role of ['DESIGN', 'TEACHING']) {
    if (!env[`${role}_MODEL_URL`] || !env[`${role}_MODEL_NAME`] || !env[`${role}_MODEL_KEY`])
      throw new Error('模型配置不完整，请先运行 npm run pc:setup。');
    let url: URL;
    try { url = new URL(env[`${role}_MODEL_URL`]!); } catch { throw new Error('模型中转地址格式不正确，请检查本机配置。'); }
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password)
      throw new Error('模型中转须使用 HTTP 或 HTTPS，密钥请单独配置。');
    if (url.protocol === 'http:' && env.ALLOW_INSECURE_MODEL_HTTP !== 'true' && !['localhost', '127.0.0.1'].includes(url.hostname))
      throw new Error('当前 HTTP 模型中转尚未启用，请检查 ALLOW_INSECURE_MODEL_HTTP 配置。');
  }
  const port = Number(env.PORT || 5173);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT 需要填写1至65535之间的整数。');
  return port;
}
export function configurePc(contents: string, key: string) {
  const existing = parse(contents);
  const values: Record<string, string> = {
    PORT: existing.PORT || '5173', HOST: '127.0.0.1',
    DATABASE_PATH: existing.DATABASE_PATH || 'data/workspace.sqlite',
    VITE_SERVICE_MODE: 'server', VITE_API_BASE_URL: '', ENABLE_LEGACY_SEED: 'false',
  };
  for (const role of ['DESIGN', 'TEACHING']) {
    values[`${role}_MODEL_URL`] = existing[`${role}_MODEL_URL`] || relayDefault.url;
    values[`${role}_MODEL_NAME`] = existing[`${role}_MODEL_NAME`] || relayDefault.name;
    values[`${role}_MODEL_KEY`] = existing[`${role}_MODEL_KEY`] || key;
  }
  values.ALLOW_INSECURE_MODEL_HTTP = ['DESIGN', 'TEACHING'].some(role => values[`${role}_MODEL_URL`].startsWith('http:'))
    ? 'true' : existing.ALLOW_INSECURE_MODEL_HTTP || 'false';
  validateLiveSettings(values);
  if (Object.values(values).some(value => /[\r\n\0]/.test(value))) throw new Error('配置不能含换行或控制字符。');
  const result = contents.split(/\r?\n/).filter(line => {
    const name = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/)?.[1];
    return !name || !(name in values);
  }).join('\n').trimEnd();
  const assignments = Object.entries(values).map(([name, value]) => {
    for (const quote of ["'", '`', '"']) {
      if (value.includes(quote)) continue;
      const line = `${name}=${quote}${value}${quote}`;
      if (parse(line)[name] === value) return line;
    }
    throw new Error('配置中含无法保存的特殊字符，原文件未修改。');
  });
  return `${result}${result ? '\n' : ''}${assignments.join('\n')}\n`;
}
export async function savePrivateConfig(file: string, contents: string) {
  const temporary = `${file}.pc-${randomUUID()}`;
  try {
    await writeFile(temporary, contents, { mode: 0o600, flag: 'wx' });
    await rename(temporary, file);
  } finally { await rm(temporary, { force: true }); }
}
export async function secretInput(prompt: string) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('请在本机终端运行配置，密钥输入不会显示。');
  const output = new Writable({ write(_chunk, _encoding, callback) { callback(); } });
  const input = createInterface({ input: process.stdin, output, terminal: true });
  process.stdout.write(prompt);
  try {
    return await new Promise<string>((resolve, reject) => {
      input.on('SIGINT', () => { input.close(); reject(new Error('配置已取消。')); });
      input.on('close', () => reject(new Error('配置未完成。')));
      input.question('', answer => resolve(answer.trim()));
    });
  } finally { input.close(); process.stdout.write('\n'); }
}
