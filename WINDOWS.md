# Windows 运行与双平台开发

更新日期：2026-10-12。用户已选择在当前 Windows PC 同源运行前后端。优先使用仓库根目录的 **启动教学工坊.cmd**；真实模型配置、教师注册、局域网试用和数据边界见 [Windows 本机部署](main/docs/Windows本机部署.md)。当前工具仍连接云端工作区，实际 PC 启动结果不能由云端检查代替。

## 首次准备

安装 Git、Node.js **24.13.0 x64**（当前 Mac 配套 npm 为 11.6.2），以及 Google Chrome。确认 `git --version`、`node --version`、`npm --version` 可执行。Windows ARM 的 PDF 原生依赖仍需另行验证，优先使用 x64 环境。

目标仓库：https://github.com/sfwensnote/edu-skill-store-with-pbl 。2026-10-10 已获首次提交和推送授权；以下克隆命令在首次推送完成后执行，默认分支为 main。

```powershell
New-Item -ItemType Directory -Force C:\dev | Out-Null
Set-Location C:\dev
git clone https://github.com/sfwensnote/edu-skill-store-with-pbl.git
Set-Location .\edu-skill-store-with-pbl\main
npm ci
npm run dev
```

访问 http://127.0.0.1:5173/#/home 。不需要单独启动 Vite、数据库服务或模型服务。

也可先按 MIGRATION_FILES.txt 私下复制源码进行离线迁移，再安装依赖。不要照搬 Mac 项目目录名末尾的空格；使用 `C:\dev\edu-skill-store-with-pbl`。不要复制 Mac 的 node_modules、dist 或测试产物。安装需能够访问 npm registry；本说明未下载 Windows 安装包。

根目录 .nvmrc 记录版本；nvm-windows 不会自动按它切换，仍需主动选择对应版本。应用命令一律在 **main/** 下运行，数据库、.env 和生产 dist 都按此工作目录定位。

## 验证与生产预览

在第二个 PowerShell 窗口进入 main/：

```powershell
npm run build
$testFiles = Get-ChildItem .\tests\*.test.ts | ForEach-Object { $_.FullName }
node --import tsx --test $testFiles
```

上面的测试命令由 PowerShell 展开文件名，避免依赖 shell 对 `tests/*.test.ts` 的处理差异。当前教师流程的 43 项 Playwright 基线命令见 AGENTS.md；执行时保持开发服务运行。配置指定 `channel: 'chrome'`，需要 Google Chrome，仅安装 Playwright Chromium 不够。完整 `npm run test:e2e` 还含未整理的历史页面断言。

生产预览先停止开发服务，再运行：

```powershell
npm run build
$env:NODE_ENV = 'production'
node --import tsx server/index.ts
```

`npm start` 已改成跨平台生产入口，Windows 可直接使用。真实前后端本机部署使用 `npm run pc:start`，它同时构建同源根路径网页。停止生产预览后，在同一终端恢复开发前执行：

```powershell
Remove-Item Env:NODE_ENV -ErrorAction SilentlyContinue
npm run dev
```

开发、生产共用 5173，不要同时启动。已有程序占用该端口时先确认并停止对应程序，不要随意结束其他进程。

## 环境变量与平台依赖

- 真实本机服务通过 `npm run pc:setup` 创建或补全私有 `.env`；已有凭据和数据库设置保留。
- 保留 PORT=5173；localhost、127.0.0.1 及不同端口属于不同浏览器存储来源。
- DESIGN_MODEL_*、TEACHING_MODEL_* 用于已授权的真实检测和学伴对话；模型中转密钥仅在本机服务端私有配置，不进入 VITE 变量或 Git。
- DATABASE_PATH 默认 data/workspace.sqlite。迁移时使用当前机器上的相对路径，不沿用 Mac 绝对路径；自定义路径的父目录须存在。
- package-lock.json 包含 darwin、win32 等可选原生包，属于正常跨平台锁定。npm ci 在各平台安装适用版本，不更换锁文件或复制本机安装目录。
- .gitattributes 统一源码 LF，二进制不换行转换。不得创建大小写冲突或依赖大小写错误的文件引用。

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

## 教师作品与草稿的私有迁移

当前前端内容在浏览器 localStorage／sessionStorage 中，Git 或 SQLite 不能替代这些数据。需要保留作品时，先在 Mac 的原浏览器、原标签页、原地址 http://127.0.0.1:5173 打开开发者工具控制台，手动执行以下导出；未保存的情境设计部分依赖当前标签页 sessionStorage，必须在关闭该标签页前导出。

**此操作本轮尚未执行。备份含教师内容，不上传 GitHub。**

```javascript
(() => {
  const allowed = key => /^(teaching-assistant\.|teaching-method\.)/.test(key);
  const read = storage => Object.fromEntries(
    Object.keys(storage).filter(allowed).map(key => [key, storage.getItem(key)])
  );
  const backup = {
    format: 'teaching-workspace-backup-v1',
    origin: location.origin,
    exportedAt: new Date().toISOString(),
    localStorage: read(localStorage),
    sessionStorage: read(sessionStorage),
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `teaching-workspace-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
})();
```

检查下载文件的 format、origin、日期及键数量。项目键通常以 teaching-assistant. 或 teaching-method. 开头，包括作品、方法草稿、核对进度、集市收藏及未完成情境设计。不导出 Cookie 或其他站点的数据。将备份放在私有渠道，或项目中被忽略的 migration-private/ 下。

Windows 启动应用后，推荐用一个**新的独立浏览器配置文件**访问同一地址，再导入。已有 Windows 内容时先按上面方法导出备份；恢复会覆盖备份中同名键，不负责两端内容合并。下面代码只提供文件选择器，校验完成才写入，未选择文件不会改动数据。

```javascript
(() => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = async () => {
    if (!input.files?.[0]) return;
    try {
      const backup = JSON.parse(await input.files[0].text());
      if (backup.format !== 'teaching-workspace-backup-v1' || backup.origin !== location.origin) {
        throw new Error('备份格式或访问地址不一致');
      }
      const groups = [[localStorage, backup.localStorage], [sessionStorage, backup.sessionStorage]];
      for (const [, values] of groups) {
        if (!values || typeof values !== 'object' || Array.isArray(values)) throw new Error('备份结构错误');
        for (const [key, value] of Object.entries(values)) {
          if (!/^(teaching-assistant\.|teaching-method\.)/.test(key) || typeof value !== 'string') {
            throw new Error('备份含不允许恢复的键或值');
          }
        }
      }
      for (const [storage, values] of groups) {
        for (const [key, value] of Object.entries(values)) storage.setItem(key, value);
      }
      location.reload();
    } catch (error) {
      alert(`恢复未完成：${error.message}。保留原备份；容量不足时可能已写入部分内容。`);
    }
  };
  input.click();
})();
```

以上备份脚本已做静态审阅，未在用户浏览器执行；恢复后需实际检查作品、草稿、收藏和任务。如果两端分别产生新内容，先保留两个备份，不要用覆盖恢复冒充同步。

## 旧后台数据库（仅在需要历史后台资料时迁移）

main/data/workspace.sqlite 包含账户、密码哈希、会话和项目记录，不进入版本管理。不需要旧后台资料时，Windows 启动会创建本机数据库，但不会自动带来 Mac 浏览器中的作品。

需要保留数据库时，使用 SQLite 一致性备份；或者先完全停止所有访问它的应用进程，再私下复制数据库及仍存在的 -wal、-shm 文件作为一组。**不能只复制运行中的 .sqlite 主文件**，WAL 中可能有尚未合并的记录。原库保留，恢复前也备份目标库；复制时 Windows 服务同样必须停止。不要提交 .sqlite、-wal、-shm 或数据导出文件。

数据库迁移和 .env 恢复均未在本轮执行。数据库中的旧会话属于私有认证资料，不应通过公开仓库传输。

## Mac／Windows 交替开发

首次建库已获用户批准。后续每次换机器前，在当前机器检查 `git status`，按已授权范围提交并推送；切换到另一台时先确认工作区干净，再 `git pull --ff-only`。有未提交内容时先保留，不用 reset、clean 或强制推送覆盖。

package-lock.json 变化后在该机器重新 npm ci。保持相同 Node 版本；编辑器使用 UTF-8。源码经 Git 同步，浏览器作品和私有配置单独管理，不承诺自动跨设备同步。当前已检查源码文件名和导入大小写无冲突；唯一目录命名问题是 Mac 外层目录末尾空格。

2026-10-14 已将本机网页与公网隧道改为 Windows 计划任务 Shishuo-AlwaysOn 托管。任务由系统服务拉起独立 Node supervisor，不依赖 Codex；当前父进程已确认为 svchost.exe。登录 Windows 后自动启动，执行时限为 PT0S，任务异常按1分钟重启，网页或隧道子进程异常按5秒重启。主控脚本为 main/scripts/keep-workbench-running.mjs；运行状态与日志保存在忽略目录 backups/windows-hosting。当前公网地址自动写入根目录师说公网地址.txt，隧道重建后地址可能变化。手动启动使用启动师说后台.cmd。关闭 Codex 不停止后台；电脑关机、休眠、断网或注销 Windows 会影响访问。本轮由主 Agent 直接完成，不使用技能，按用户要求停止只读子代理，未运行测试或模型请求。
