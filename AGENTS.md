# AGENTS.md

更新日期：2026-10-10。适用于整个项目。先阅读本文件、HANDOFF.md 和 main/PRODUCT.md；跨平台运行见 WINDOWS.md，迁移状态见 MIGRATION_REPORT.md。

## 协作规则

1. 默认简洁，先说结论；仅在适合比较或分步执行时使用列表。
2. 按任务规模组织模块，避免新增超大或高耦合文件；只为复杂、非显然逻辑添加必要注释。
3. 用户指令优先于 Skill；只在点名或任务直接匹配时加载。清晰、可逆的小任务直接执行。
4. 验证与风险相称；相关检查通过后，没有新变化就不重复或扩大测试。
5. 未经明确授权不主动提交或推送 Git，不删除、清理或重构现有代码。2026-10-10 用户确认恢复原版，删除上一轮新增 SKILL Demo。后续在原有前端基础上逐块梳理代码，每轮先明确范围；本地完成并提供验收，收到用户明确“确认”后才提交、推送和通过 Actions 发布，之后再进入下一轮。先前发布授权不替代本轮验收。
   本轮用户进一步指定移除教学活动、首页情境和创建中的情境入口，将“我的作品”改为“我的 SKILL”并只保留 SKILL，并明确要求修改后上传发布；该指令授权当前这一批的提交与 Pages 发布，不代表后续批次已验收。
   后续集市添加／改编边界、三类我的 SKILL 和首页标题批次已完成本地验收；2026-10-10 用户明确“确认发布”，授权提交、推送 main 并通过 Pages Actions 发布该批，后续批次仍需单独确认。
6. 不清空教师的浏览器存储或数据库；测试写入使用隔离资料。
7. 源码、注释、文档、界面和错误提示使用简体中文；教师界面中的 SKILL 大写。

## 当前产品与架构

以 `b99c13e` 的原版首页、导航、SKILL 集市及组件为恢复基线。禁止重新建立一套独立前端或数据模型。用户进一步要求移除全部 PBL 相关内容，重心为 SKILL 创建、检测、试用和发布的完整 Demo。此目标分批实现，先梳理入口与依赖，再移除模块；保留用户认可的集市布局和视觉。每批改动和验收单独确认。最新一批明确要求集市“查看与试用”和“添加到我的 SKILL”，固定示例试用不创建个人副本；新增改编需求后才进入独立草稿。

教学工坊是面向教师的客户演示工作台。当前主要流程只做前端，不调用真实 LLM、不新增复杂后端或真实学生账号。2026-10-10 用户明确授权使用 GitHub Actions 部署前端到 GitHub Pages；只发布静态构建，不公开本机数据库或 Express 服务。

- 日常教学：填写想法 → 六轮互动梳理与编辑 → 形成 SKILL 后直接核对 → 学生视角预览 → 返回作品或分享。
- 首页与创建只进入 SKILL 编辑；主导航为首页、教学 SKILL 集市和我的 SKILL。
- 集市：保留原布局、搜索、分类、标签、收藏；“查看与试用”进入详情与固定引导示例，“添加到我的 SKILL”保留来源版本快照，不创建可编辑副本。“改编 SKILL”先填写新需求，再进入原创建流程，需重新检测与发布。
- 我的 SKILL：沿用原作品页，分为全部／我创建的／从集市添加。原版添加项只读，可试用、改编或移除；创建项保留原编辑、复制、删除、展示与作者试用。草稿属于我创建的；不显示探究成果、助手分类、教学活动配置或旧任务档案。
- 原有情境探究和教学任务已移除主入口，旧作品与直接路由暂留兼容，相关模块待后续批次清理。

当前前端使用 localStorage／sessionStorage；本机运行时 Express 同源托管 Vite 或生产静态文件，Pages 仅托管 main/dist。原有认证、SQLite、材料解析、双模型及六步后台流程仍保留，但不是当前前端已接入真实服务的证明。

## 技术栈与目录

应用根目录为 main/，包管理器为 npm。

- Node.js 24；已验证版本 24.13.0，根目录 .nvmrc 固定此版本。当前 npm 11.6.2。
- React 19、TypeScript 5.9（严格模式）、Vite 7、Tailwind CSS 4、Radix／shadcn 风格组件、lucide-react、自动增高文本框。
- Express 5、tsx、Node 内置 node:sqlite；Zod 校验；pdf-parse、mammoth、Multer 保留用于材料解析。
- node:test 单元／集成测试；Playwright 使用本机 Google Chrome，workers: 1。

| 目录 | 用途 |
| --- | --- |
| main/src/features/designer | 想法、六问、教师方法编辑与封装 |
| main/src/features/testing、usage | 方法核对、就地修改、步骤阅读、学生视角预览和旧报告 |
| main/src/features/inquiry | 情境题、任务链、PBL 编辑、确认与导出 |
| main/src/features/marketplace、workshop、space | 首页、集市、作品、教学任务、应用配置 |
| main/src/components、styles | 公共导航、表单、弹窗、对话框及视觉体系 |
| main/src/data | 必须迁移的前端样例源码，不能被数据库忽略规则排除 |
| main/src/hooks | 本机存储、路由和焦点管理 |
| main/shared | 教学方法、作品、任务、分类、版本与兼容规则；保留旧状态机 |
| main/server | Express、认证、SQLite、模型与材料适配 |
| main/tests | 当前与历史单元／浏览器检查 |
| main/public | 页面实际使用的 SVG 静态资源 |
| main/docs、images | 设计、审查、演示文档与参考图 |
| .agents/skills | 项目 frontend-design、shadcn 技能；不是应用运行依赖 |
| main/data | 私有 SQLite、WAL、SHM，禁止提交 |

服务必须从 main/ 工作目录启动；data、dist 和 .env 的定位依赖工作目录。开发模式 Vite 作为 Express 中间件，无独立前端端口。默认仅监听 http://127.0.0.1:5173。

## 安装、运行和测试

首次安装或跨设备恢复：
```sh
cd main
npm ci
npm run dev
```

日常检查：
```sh
npm test
npm run build
npm run test:e2e
```

npm run build 执行 tsc --noEmit 后运行 Vite。npm test 是 tsx --test tests/*.test.ts。沙箱禁止 tsx IPC 或本机监听时，可使用 node --import tsx --test，并只为本机协议夹具申请所需运行权限，不删除测试或调用付费模型。

macOS 生产预览可 npm start。现有 start 使用 NODE_ENV=production，Windows cmd／PowerShell 不兼容该赋值语法；按 WINDOWS.md 设置环境变量并执行 node --import tsx server/index.ts。本次不修改 package.json 脚本。

当前客户流程的 43 项浏览器基线：
```sh
npx --no-install playwright test tests/creation-flow.spec.ts tests/frontend-review.spec.ts tests/functional-audit.spec.ts tests/home.spec.ts tests/market-catalog.spec.ts tests/method-review.spec.ts tests/teaching-activity.spec.ts tests/teaching-tags.spec.ts tests/trial-preview.spec.ts tests/workshop.spec.ts
```

E2E 运行前保持开发服务和 Chrome 可用。测试地址固定 5173。完整 test:e2e 还包括历史用例，部分保留旧页面断言，不能把“当前 43 项通过”说成“全部历史 E2E 已通过”。

## 产品规则与测试重点

- 方法来源于教师回答与修订；手动编辑优先，未提交回答作为草稿保留。
- 教学分类必选，与集市六项一致；标签可自定义。已经取消的“最多两类／额外三个标签”不重新引入。
- 核对中可以修改当前方法；保存后版本更新，旧核对、分享和运行证据失效。
- 未核对、未采用的方法不能冒充已验证；多方法预览仅分享当前选择的方法。
- 教师核对、固定示例、规则模拟、真实运行和教学效果相互独立；不编造调用、分数、触发率或效果。
- 教学任务要求不修改源作品；已有提交保留快照，继续修改产生副本。
- 持久化失败保留输入、不继续跳转、不假报成功。
- 保留已认可的绿色、白色与浅灰绿视觉，减少宣传文案、重复说明和术语；不因局部改动建立另一套导航或设计系统。
- 保留旧路由与资料兼容。主要导航不提供教学助手库入口，不把历史方法试用混入学生任务。

## 原有后台约束

密钥只在服务端 .env，不进入前端、日志或 Git。两个模型的 URL 与 NAME 都配置后旧 API 才进入 live；当前前端演示主流程不调用这些接口。

修改旧需求／能力／材料时遵守 shared/domain.ts 的失效与版本规则，真实 review 不通过时不得启用。材料是数据，不得覆盖教学系统指令。

数据库含账户、密码哈希、会话令牌和项目数据；不提交数据库或浏览器备份。当前预置后台有固定演示账户，不能直接作为公网生产认证使用。

保留同源请求检查、scrypt、HttpOnly/SameSite Cookie、上传限制。Express 只监听 127.0.0.1；后台公网部署仍需另行授权。静态演示前端的 GitHub Pages 部署已获用户授权。

## 跨平台与 Git

- 保留 main/package-lock.json，使用 npm ci；不跨机器复制 node_modules、dist、测试产物或 SQLite 实时文件。
- 两台机器用同一 Node 版本；Windows 优先 x64 Node，ARM 环境的 PDF 原生依赖需另行验证。
- 源码路径使用相对路径、path 和 import.meta.url；不要新增 /Users、/Applications、盘符或用户目录硬编码。
- Windows 推荐 C:\dev\edu-skill-store-with-pbl。Mac 原目录名末尾有空格，不照搬到 Windows；本次不更名现目录。
- .gitattributes 统一源码 LF，二进制不转换；Windows 脚本 .bat／.cmd 使用 CRLF。文件名与导入大小写必须完全一致。
- 数据库忽略范围仅 /data/ 与 /main/data/；main/src/data 必须进入源码迁移。
- 浏览器数据不是 Git 数据；只在需要迁移作品时通过私有备份恢复，不自动同步或合并两台机器的作品。
- 指定 origin：https://github.com/sfwensnote/edu-skill-store-with-pbl 。2026-10-10 已按用户批准初始化本地 main 分支；初始化前远程只读查询无分支／标签。实际提交和推送状态以 Git 记录为准；后续操作遵守用户授权范围。

## 文档与技能

当前产品合同：main/PRODUCT.md。最新流程审查：main/docs/流程简化与需求核验.md。演示脚本：main/docs/全功能Demo演示脚本.md。

涉及对应任务时按 .agents/skills/frontend-design/SKILL.md、.agents/skills/shadcn/SKILL.md 工作；用户指令优先。旧文档中的六步流程、独立确认页和双路径入口只是历史实现，不能强迫恢复到当前界面。
