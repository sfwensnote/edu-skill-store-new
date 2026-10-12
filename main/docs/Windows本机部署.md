# Windows 本机部署

2026-10-12。前端、真实身份、模型调用、学生对话与报告由这台 PC 同源提供；沿用当前页面。模型中转只负责模型调用，不保存本项目的试用记录。

## 首次启动

安装 Node.js 24 x64（项目配套版本24.13.0）和 Git。已有仓库时先保留未提交改动，更新 main 并执行 `npm ci`；不要覆盖 `.env`、数据库或浏览器作品。

尚未下载时，可在 PowerShell 执行：

```powershell
git clone https://github.com/sfwensnote/edu-skill-store-with-pbl.git
```

双击仓库根目录的 **启动教学工坊.cmd**。首次运行会安装依赖，随后在本机终端输入模型中转密钥，输入不显示。密钥保存到 `main/.env`，不写进网页、源码或命令参数。默认模型是已指定的 `deepseek-v4.1-flash`，已指定的 HTTP 中转作为后端调用地址。检测和教学共用该中转；已有模型地址、名称、凭据和数据库路径保留。

脚本构建根路径网页并启动正式服务，打开 **http://127.0.0.1:5173/#/home**。首次自行注册教师账号；浏览器中的旧演示账号不是服务端账号。终端保持开启，停止按 Ctrl+C，重启不删除资料。端口被占用时给出提示，不结束其他程序。

也可在仓库的 `main/` 目录手动执行：

```powershell
npm ci
npm run pc:setup
npm run pc:check
npm run pc:start
```

`pc:check` 发出一次简短真实模型请求，相同中转、模型和凭据只调用一次。成功只表示模型能回复，教学方法仍需完成各自的 SKILL 检测。检查失败时给出网络或 HTTP 状态，密钥和中转错误正文不输出。

后续代码更新且锁文件变化后重新 `npm ci`。双击入口不覆盖已有凭据；每次启动重新构建本机网页，避免误用 GitHub Pages 子路径构建或静态登录模式。

## 学生在同一局域网试用

默认只开放给这台 PC 自测。需要同一 Wi-Fi／有线局域网中的学生访问时，在 `main/` 执行：

```powershell
npm run pc:start -- --lan
```

终端会列出局域网访问地址。教师使用该地址进入并复制试用链接，学生也使用同一地址；`127.0.0.1` 链接指向学生自己的设备，不能直接转发。Windows 防火墙需允许该端口在受信任的专用网络访问；跨网络学生需要另外配置可访问的 HTTPS 地址。

PC 关机或服务停止后试用链接不可连接，已保存的记录仍保留。不要把 GitHub Pages 的 API_BASE_URL 配成 `127.0.0.1`，那会指向每个访问者自己的电脑；本轮直接使用 PC 提供的网页。

## 数据与管理员

服务端数据库默认为 `main/data/workspace.sqlite`，保存身份、检测、试用快照、对话和报告。SKILL 编辑工作区、收藏、集市以及原附件仍属于当前浏览器；GitHub Pages 和本机网址的浏览器资料不会自动合并。原浏览器资料和一次性清理标记不修改。

管理员由本机部署者创建，没有默认公开管理员密码。在 `main/` 使用 PowerShell：

```powershell
$privatePassword = Read-Host '管理员密码（至少12位）' -AsSecureString
try {
  $env:ADMIN_PASSWORD = [System.Net.NetworkCredential]::new('', $privatePassword).Password
  npm run admin:create -- schooladmin 管理员
} finally {
  Remove-Item Env:ADMIN_PASSWORD -ErrorAction SilentlyContinue
  $privatePassword.Dispose()
}
```

备份数据库时先停止本项目，保留数据库及仍存在的 WAL／SHM 文件；正式数据不提交 GitHub。

## 验证边界

本机部署配置、生产启动、网页根路径、凭据不进前端和数据库重启由隔离测试检查，另有 Windows Actions 执行这些检查。云端工作区的成功不代表用户 PC 已经启动；真实 PC 和实际中转的结果以本机执行为准。
