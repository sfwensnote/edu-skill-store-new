# 教学助手平台 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有六步教育 Skill 构建器重构为可运行的“助手库—AI 设计器—Skill 检测—投入使用—运行记录”全栈 Demo。

**Architecture:** 沿用 React、TypeScript、Vite、Express 与 `node:sqlite`。前端使用轻量 Hash 路由和按业务域拆分的页面；后端以统一的助手仓储、设计服务、检测服务、运行服务和 Qwen 兼容模型适配器提供同源 API。未配置模型时使用可重复的 Mock AI 数据完成整个闭环。

**Tech Stack:** React 19、TypeScript、Vite 7、Express 5、SQLite、Zod、Lucide、shadcn 基础组件、node:test、Playwright。

## Global Constraints

- 创建页为单页双栏工作区，不保留六步流程和教学材料上传。
- Skill 固定包含 `name`、`summary`、`purpose`、`trigger`、`behaviorSteps`、`constraints`。
- 助手状态仅为 `DRAFT`、`GENERATED`、`TESTED`、`ACTIVE`。
- 所有界面文案面向普通教师，使用简体中文，不暴露 Prompt、RAG、JSON、模型参数等术语。
- 桌面视觉以四张参考图为准；900px 以下使用页签或抽屉式适配，不允许横向溢出。
- 模型密钥仅由服务端环境变量读取；缺少配置时必须自动进入 Mock AI 模式。
- 不新增材料、知识库、复杂评分、图表、权限、支付或工作流画布。

---

### Task 1: 核心数据结构与状态机

**Files:**
- Create: `shared/assistant.ts`
- Create: `tests/assistant-platform.test.ts`
- Modify: `server/store.ts`

**Interfaces:**
- Produces: 助手、Skill、检测、运行记录的 Zod schema 与纯函数；SQLite 表及演示种子数据。

- [ ] **Step 1: Write the failing tests**：覆盖 Skill 校验、状态流转、助手库筛选、日志统计。
- [ ] **Step 2: Run tests and verify RED**：运行 `npx tsx --test tests/assistant-platform.test.ts`，确认缺少新模块而失败。
- [ ] **Step 3: Implement schemas and pure functions**：实现最小且明确的领域模型。
- [ ] **Step 4: Run tests and verify GREEN**：同一命令全部通过。
- [ ] **Step 5: Add relational SQLite tables and idempotent seed**：沿用现有数据库连接，不引入 Prisma。

### Task 2: 设计、生成、检测与运行服务

**Files:**
- Create: `server/platform/repository.ts`
- Create: `server/platform/mock-ai.ts`
- Create: `server/platform/llm.ts`
- Create: `server/platform/services.ts`
- Create: `server/platform/router.ts`
- Modify: `server/index.ts`
- Test: `tests/platform-services.test.ts`

**Interfaces:**
- Consumes: Task 1 的 schema 与 SQLite 表。
- Produces: `/api/library`、`/api/assistants`、designer、generate、tests、activate、chat、logs、reports API。

- [ ] **Step 1: Write failing service tests**：覆盖 Mock 设计、7 个检测情境、运行异常和报告汇总。
- [ ] **Step 2: Verify RED**：运行新增测试并确认失败原因来自未实现服务。
- [ ] **Step 3: Implement Mock AI and repository**：确保无密钥也能完成全流程。
- [ ] **Step 4: Implement Qwen-compatible adapter**：支持 `QWEN_API_BASE`、`QWEN_API_KEY`、`QWEN_MODEL`、`QWEN_JUDGE_MODEL`，结构化输出失败重试一次。
- [ ] **Step 5: Implement API router and verify GREEN**：加入认证边界、友好中文错误与职责清晰的接口。

### Task 3: 路由、会话与统一页面骨架

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/lib/routes.ts`
- Create: `src/hooks/useSession.ts`
- Create: `src/components/AppHeader.tsx`
- Create: `src/pages/LoginPage.tsx`
- Create: `src/styles/tokens.css`
- Create: `src/styles/shell.css`

**Interfaces:**
- Produces: 所有新 Hash 路由、登录/注册/退出、60px 顶部导航、统一加载与错误状态。

- [ ] **Step 1: Write failing route and E2E assertions**：确认旧六步路径不再是主流程，新路由可解析。
- [ ] **Step 2: Verify RED**。
- [ ] **Step 3: Implement route parser and shell**。
- [ ] **Step 4: Implement account flow and verify GREEN**。

### Task 4: 助手库、详情与我的助手

**Files:**
- Create: `src/features/library/LibraryPage.tsx`
- Create: `src/features/library/AssistantList.tsx`
- Create: `src/features/library/LibraryDetailPage.tsx`
- Create: `src/features/library/MyAssistantsPage.tsx`
- Create: `src/styles/library.css`

**Interfaces:**
- Consumes: library/assistants API。
- Produces: 搜索、学段/学科/活动筛选、公共助手详情、按状态跳转的教师助手列表。

- [ ] **Step 1: Add failing E2E assertions for search/filter/navigation**。
- [ ] **Step 2: Verify RED**。
- [ ] **Step 3: Implement compact list UI and state-aware navigation**。
- [ ] **Step 4: Verify desktop and mobile behavior**。

### Task 5: 单页 AI 教学设计器与 Skill 展开

**Files:**
- Create: `src/features/designer/DesignerPage.tsx`
- Create: `src/features/designer/DesignerChat.tsx`
- Create: `src/features/designer/AssistantDraft.tsx`
- Create: `src/features/designer/SkillSection.tsx`
- Create: `src/styles/designer.css`

**Interfaces:**
- Consumes: assistant、designer/chat、generate API。
- Produces: 左侧自然语言协作、右侧实时设计稿、单 Skill 展开、上下文调整、原地生成状态和检测入口。

- [ ] **Step 1: Add failing E2E path for first design message and Skill update**。
- [ ] **Step 2: Verify RED**。
- [ ] **Step 3: Implement responsive split workspace**。
- [ ] **Step 4: Implement generation state without premature navigation**。
- [ ] **Step 5: Verify expanded Skill content and mobile tabs**。

### Task 6: 检测工作区与激活

**Files:**
- Create: `src/features/testing/TestingPage.tsx`
- Create: `src/features/testing/TestCaseRecord.tsx`
- Create: `src/features/testing/SkillResults.tsx`
- Create: `src/styles/testing.css`

**Interfaces:**
- Consumes: tests/latest、tests、activate API。
- Produces: 自动检测进度、Case 检查记录、Skill 状态、返回调整和确认投入使用。

- [ ] **Step 1: Add failing E2E path for 7-case run and activation**。
- [ ] **Step 2: Verify RED**。
- [ ] **Step 3: Implement testing workspace and progressive presentation**。
- [ ] **Step 4: Verify status transition to ACTIVE and logs navigation**。

### Task 7: 使用页、运行记录、详情与报告

**Files:**
- Create: `src/features/usage/UsePage.tsx`
- Create: `src/features/usage/LogsPage.tsx`
- Create: `src/features/usage/LogDetailPage.tsx`
- Create: `src/features/usage/ReportPage.tsx`
- Create: `src/styles/usage.css`

**Interfaces:**
- Consumes: chat、logs、reports API。
- Produces: 可产生真实日志的学生端对话、7 日摘要、Skill 使用比例、异常过滤、日志详情和网页报告。

- [ ] **Step 1: Add failing service and E2E tests for chat/log/report**。
- [ ] **Step 2: Verify RED**。
- [ ] **Step 3: Implement runtime and log pages**。
- [ ] **Step 4: Implement report generation and verify GREEN**。

### Task 8: 清理、文档与视觉验收

**Files:**
- Modify: `README.md`
- Modify: `.env.example`
- Modify: `DESIGN.md`
- Delete: 被新入口完全替代的六步页面、旧工作流组件与旧样式文件。
- Modify: `tests/workflow.spec.ts`

**Interfaces:**
- Produces: 可复现安装说明、Demo 账户、环境配置、完整演示路径和无死代码的新前端。

- [ ] **Step 1: Replace legacy E2E suite with the complete acceptance path**。
- [ ] **Step 2: Run `npm test` and repair failures**。
- [ ] **Step 3: Run `npm run build` and repair type/build errors**。
- [ ] **Step 4: Start the app and run `npm run test:e2e`**。
- [ ] **Step 5: Capture 1440px and 390px screenshots for library, designer, expanded Skill, testing and logs**。
- [ ] **Step 6: Compare width, proportion, typography, density, borders, spacing, controls and overflow against supplied references; repair and rerun**。

