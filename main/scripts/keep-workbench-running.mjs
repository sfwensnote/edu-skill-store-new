import { spawn } from 'node:child_process';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
const logDirectory = path.join(projectRoot, 'backups', 'windows-hosting');
mkdirSync(logDirectory, { recursive: true });
const children = new Map();
let stopping = false;
let publicUrl = '';
const jobs = [
  { name: 'workbench', executable: process.execPath, args: ['--import', 'tsx', 'server/local-workbench.ts'], cwd: path.join(projectRoot, 'main') },
  { name: 'tunnel', executable: path.join(projectRoot, '.local-deploy', 'cloudflared.exe'), args: ['tunnel', '--url', 'http://127.0.0.1:5173', '--no-autoupdate', '--protocol', 'http2'], cwd: projectRoot },
];

function state() {
  writeFileSync(path.join(logDirectory, 'status.json'), JSON.stringify({
    supervisorPid: process.pid, updatedAt: new Date().toISOString(), publicUrl,
    processes: Object.fromEntries([...children].map(([name, child]) => [name, child.pid || null])),
  }, null, 2));
}
function note(message) {
  appendFileSync(path.join(logDirectory, 'supervisor.log'), `${new Date().toISOString()} ${message}\n`);
}
function start(job) {
  if (stopping) return;
  let recent = '';
  const child = spawn(job.executable, job.args, {
    cwd: job.cwd, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, WORKBENCH_PORT: '5173' },
  });
  children.set(job.name, child);
  state();
  note(`${job.name} 已启动，进程 ${child.pid || '待分配'}。`);
  function output(chunk) {
    appendFileSync(path.join(logDirectory, `${job.name}.log`), chunk);
    if (job.name !== 'tunnel') return;
    recent = (recent + chunk.toString('utf8')).slice(-8192);
    const match = recent.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (match && publicUrl !== match[0]) {
      publicUrl = match[0];
      writeFileSync(path.join(projectRoot, '师说公网地址.txt'), `${publicUrl}/#/home\n`);
      state();
    }
  }
  child.stdout.on('data', output);
  child.stderr.on('data', output);
  child.on('error', () => note(`${job.name} 未能启动，请查看对应运行日志。`));
  child.once('close', code => {
    children.delete(job.name);
    if (job.name === 'tunnel') {
      publicUrl = '';
      writeFileSync(path.join(projectRoot, '师说公网地址.txt'), '公网入口正在重连，请稍后重新打开此文件。\n');
    }
    state();
    note(`${job.name} 已退出，退出码 ${code ?? '未知'}。`);
    if (!stopping) setTimeout(() => start(job), 5000);
  });
}
function stop() {
  if (stopping) return;
  stopping = true;
  for (const child of children.values()) child.kill();
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
writeFileSync(path.join(projectRoot, '师说公网地址.txt'), '公网入口正在启动，请稍后重新打开此文件。\n');
for (const job of jobs) start(job);
