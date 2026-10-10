# Mac → Windows 迁移检查报告

检查日期：2026-10-10。目标仓库：[edu-skill-store-with-pbl](https://github.com/sfwensnote/edu-skill-store-with-pbl)。

后续状态：同日用户明确批准“提交并推送”。已初始化本地 main 分支并配置 origin；此报告保留以下准备阶段的检查快照。实际提交和推送结果以 Git 记录及操作完成后的回复为准。Windows 实机验证和私有数据备份仍未执行。

准备文档和配置已完成。应用代码、依赖版本、数据库及浏览器内容均未改动。本轮没有初始化项目 Git、暂存、提交或推送。Windows 实机验证和私有数据备份仍待执行，不能据此认定迁移已完成。

## 1. 项目、技术栈与运行

完整应用在 main/；根目录承载交接文档、迁移规则和项目技能。React 19＋TypeScript 5.9＋Vite 7＋Tailwind 4，Express 5 使用 tsx 运行，Node 内置 SQLite，Zod 校验，Playwright 和 node:test 验证。

当前教师界面以浏览器存储运行，保留后台认证、双模型、材料解析和数据库模块，未把它们重构或删除。前端当前主流程没有接入真实 LLM。详细模块及产品限制见 AGENTS.md、HANDOFF.md。

Node 24.13.0／npm 11.6.2 已在 Mac 使用。main/ 下 npm ci、npm run dev；Express 同源托管 Vite，默认仅监听 127.0.0.1:5173。生产先 npm run build，再启动服务；data、dist、.env 定位依赖 main/ 工作目录。

## 2. Git 当前状态和提交边界

当前目录没有 .git；git status 报“not a git repository”，无法提供真实的已跟踪／未跟踪索引、分支或提交历史。MIGRATION_FILES.txt 提供**尚未纳入 Git 的候选文件清单**，不能把它当作 git ls-files 的结果。

只读 git ls-remote --symref 查询指定 GitHub 仓库成功，无输出引用：检查时远程没有分支或标签。尚未配置本地 origin，未执行 clone、项目 git init、add、commit 或 push。忽略规则只在独立临时仓库测试，临时目录已清理。

首次上传应正常提交和推送，不强制覆盖。需要用户确认本报告、公开文件范围和仓库后才进行。`.agents/skills` 是本项目工具说明，非应用依赖；设计文档、参考图和 DOCX 进入候选范围，但公开前需确认授权与内容。

## 3. 已准备的文档与配置

| 文件 | 本次用途 |
| --- | --- |
| AGENTS.md | 更新真实架构、当前功能规则、运行测试和跨平台要求 |
| HANDOFF.md | 已完成功能、当前任务、遗留问题、验证证据、后续步骤 |
| WINDOWS.md | PowerShell 安装运行、兼容启动、私有数据备份与交替开发 |
| MIGRATION_FILES.txt | 完整源码候选清单、忽略文件及必要私有数据说明 |
| README.md | 更新入口及文档索引 |
| .gitignore | 补充配置变体、私有数据、凭据和生成产物规则 |
| .gitattributes | 源码 LF、二进制保留、Windows 批处理 CRLF |
| .nvmrc | 记录已验证 Node 24.13.0 |

没有修改 package.json、package-lock.json、src、shared、server 或测试代码。main/README.md 及历史设计文档保留原样；发生冲突时以当前 AGENTS.md／HANDOFF.md 和实际代码为准。

## 4. Windows 兼容性

| 检查项 | 结果与处理 |
| --- | --- |
| 外层项目目录 | Mac 名称末尾有空格；Windows 使用 C:\dev\edu-skill-store-with-pbl，不更名现有 Mac 目录 |
| 路径与导入 | 源码未发现执行用 macOS 绝对路径、缺失相对导入或大小写冲突 |
| 历史文档 | main/docs/UIUX统一重构说明.md 中有 Mac cd 路径，仅为历史命令示例 |
| npm start | Unix 行内环境变量赋值不兼容 Windows；提供 PowerShell 等效命令，暂不改原脚本 |
| npm test | 提供 PowerShell 展开测试文件的 node --import tsx --test 命令 |
| E2E 浏览器 | 使用 channel chrome，需安装 Google Chrome；非仅 Chromium |
| 原生依赖 | 锁文件含 Windows x64／部分 ARM64 可选包；Mac node_modules 不迁移，Windows 重新 npm ci |
| 配置与环境变量 | .env 不存在；模板可迁移。DATABASE_PATH 不沿用 Mac 绝对路径，NODE_ENV 生产结束后清除 |
| 文件名 | 未发现项目内非法 Windows 字符、保留名称、路径末尾空格或大小写重名；外层目录问题另列 |
| 架构差异 | 优先 Windows x64；ARM 上 PDF／canvas 原生依赖未经验证 |

没有发现项目自有 shell 脚本、macOS 专属运行服务或本地 file:／link: 依赖。锁文件的 darwin 包是正常可选依赖，不需删除。

## 5. 锁文件与忽略规则

main/package-lock.json 存在，lockfileVersion=3，576 项包记录，顶层依赖与 package.json 一致，解析地址为 npm registry。关键已安装版本一致，无需重建锁文件。

npm ls --depth=0 退出成功，但现有安装目录有额外间接包 @emnapi/wasi-threads@1.2.3；Windows npm ci 使用锁文件重装，不把当前 node_modules 当作可复现的迁移来源。

**修复了一处迁移缺文件风险：** 原 data/ 忽略规则同时排除 main/src/data，里面有前端必须的样例数据。现在只忽略 /data/ 和 /main/data/，main/src/data 正常进入候选源码。

实际忽略测试确认：.env 及变体、SQLite／WAL／SHM、私有备份、node_modules、dist 不进入候选；.env.example、main/src/data 和文档资源保留。

## 6. 文件与私有数据

完整路径清单见 MIGRATION_FILES.txt；已跟踪、未跟踪分类目前无法由 Git 判定。排除可重新生成的目录后，实际有 297 个文件：292 个源码／文档候选，3 个私有数据库文件，2 个被忽略的 .DS_Store。候选和已忽略文件分别列出，不擅自将所有文件暂存。

被忽略但**按需迁移**的实际文件是 main/data/workspace.sqlite、workspace.sqlite-wal、workspace.sqlite-shm。它们只能私下做一致性备份；不要复制运行中的主库替代备份。实际 .env、浏览器备份目前未发现，不把不存在的文件算作已有迁移资料。

当前前端作品、草稿、收藏和任务主要在浏览器 localStorage／sessionStorage，位于项目目录外。需要保留时按 WINDOWS.md 导出；未保存情境设计需在原标签页关闭前备份。只搬源码或数据库不完整，两端浏览器数据也不会经 Git 自动同步。本轮没有读取、导出或覆盖教师浏览器数据。

## 7. 敏感信息与大文件检查

对源码、配置、文档进行凭据特征扫描，并读取 DOCX 文本：未发现真实 API token、私钥或含凭据的接口地址。结果仅覆盖当前文件与识别规则，未检查不存在的 Git 历史；所有图片没有逐张人工审核，不能声称私有数据完全不存在。

保留后台 seed.ts 有固定演示账户口令，它不是模型 API 密钥，但不能用作公网生产认证。数据库有密码哈希、会话令牌和项目内容，属于私有资料：本次只读聚合元信息，未输出记录或口令。

数据库聚合：users 93、sessions 92、projects 46、assistants 14、skills 42、usage_sessions 6、usage_messages 12、anomalies 2；这些数量可能包含历史测试和种子内容，不代表真实使用人数。数据库及旁文件约 4.2 MiB，运行中可能变化。

源码／文档候选未发现单文件大于 5 MiB，不需要为当前文件引入 Git LFS。较大的参考图单文件约 1.2–1.3 MiB；docs/assets 共约 6.9 MiB，images 共约 6.0 MiB。node_modules 约 291 MiB、dist 约 0.8 MiB、测试产物约 0.2 MiB，均重新生成而非提交。完整文件统计以 MIGRATION_FILES.txt 为准。

公开前保留两项确认：参考图／截图／DOCX 是否可公开；是否需要私下保存旧后台数据。密钥、SQLite、浏览器备份已明确排除上传范围。

## 8. 验证与下一步

- Mac TypeScript＋Vite 构建通过；依赖注释与较大单包提示保留，未因此重构。
- 62 项单元／集成检查：61 项在常规环境通过，1 项本机 HTTP 夹具因沙箱监听权限失败，允许监听后单项复核通过；没有调用真实付费模型。
- 2026-10-09 当前客户流程 43 项浏览器场景通过，本次文档改动未重复运行；全部历史 E2E 不等同于这 43 项。
- 锁文件、忽略规则、路径与导入大小写检查完成。
- Windows 安装、构建、单元与浏览器实机验收未完成；私有备份／恢复未执行。

用户确认后：先保护必要私有数据，再初始化项目 Git、检查实际忽略与暂存差异、首次提交并推送指定仓库。然后在 Windows 克隆、npm ci、验证、按需恢复私有数据。当前报告不构成自动提交或推送授权。
