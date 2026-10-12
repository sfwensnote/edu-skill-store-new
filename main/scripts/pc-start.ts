import path from 'node:path';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { networkInterfaces } from 'node:os';
import { appRoot, assertNodeVersion, pcEnvironment, readPrivateConfig, validateLiveSettings } from './pc-config';

try {
  assertNodeVersion();
  process.chdir(appRoot);
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--lan')) throw new Error('本机启动仅支持 --lan 参数。');
  const lan = args.includes('--lan');
  const env = pcEnvironment(await readPrivateConfig(path.join(appRoot, '.env')), lan);
  const port = validateLiveSettings(env);
  // 占用时保留其他程序，不能为了启动项目结束未知进程。
  await new Promise<void>((resolve, reject) => {
    const probe = createServer();
    probe.once('error', () => reject(new Error(`端口 ${port} 已被占用，请先停止本项目旧服务或在 .env 更换 PORT。`)));
    probe.listen(port, env.HOST, () => probe.close(() => resolve()));
  });
  const npmCli = process.env.npm_execpath;
  if (!npmCli) throw new Error('请使用 npm run pc:start 或仓库中的双击启动入口。');
  console.log('正在构建本机网页，随后启动前后端。');
  await new Promise<void>((resolve, reject) => {
    const build = spawn(process.execPath, [npmCli, 'run', 'build', '--', '--base', '/'], { cwd: appRoot, env, stdio: 'inherit' });
    build.once('error', () => reject(new Error('构建未启动，请确认 npm 依赖已经安装。')));
    build.once('exit', code => code === 0 ? resolve() : reject(new Error('构建未完成，服务没有启动，请检查上面的提示。')));
  });
  for (const [name, value] of Object.entries(env)) if (value !== undefined) process.env[name] = value;
  process.env.NODE_ENV = 'production';
  console.log(`本机访问：http://127.0.0.1:${port}/#/home。停止服务按 Ctrl+C；数据不会清除。`);
  if (lan) {
    const addresses = [...new Set(Object.values(networkInterfaces()).flatMap(items => items || [])
      .filter(item => item.family === 'IPv4' && !item.internal && /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(item.address))
      .map(item => item.address))];
    for (const address of addresses) console.log(`局域网访问：http://${address}:${port}/#/home`);
    console.log('教师请用与学生相同的局域网地址进入，再复制试用链接。');
  }
  await import('../server/index');
} catch (error) { console.error(error instanceof Error ? error.message : '本机服务未启动。'); process.exitCode = 1; }
