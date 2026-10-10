# 学生试用与助手库发布 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将检测后的阶段改为学生试用，并让教师从试用报告把助手公开发布到助手库。

**Architecture:** 在共享状态中增加 `TRIAL`，保持检测完成、试用中、正式发布三个状态可区分。复用现有运行记录作为试用数据页，报告页按状态呈现试用报告或运行报告；公开助手由 `App` 合并静态库与本地已发布助手后传入助手库。

**Tech Stack:** React 19、TypeScript、localStorage、Playwright、现有 shadcn Button。

## Global Constraints

- 试用由学生完成，教师不需要完成对话。
- Demo 不建设学生账号、审核、版本市场或权限系统。
- 保持现有路由、页面视觉和学生端结构。
- 当前目录没有 Git 元数据，因此不包含提交步骤。

---

### Task 1: 试用状态与流程跳转

**Files:**
- Modify: `shared/assistant.ts`
- Modify: `src/data/platform.ts`
- Modify: `src/features/testing/TestingPage.tsx`
- Modify: `src/features/usage/LogsPage.tsx`
- Modify: `src/App.tsx`
- Test: `tests/platform-core.test.ts`
- Test: `tests/workflow.spec.ts`

**Interfaces:**
- Adds: `AssistantStatus = 'TRIAL'`
- Renames: `TestingPage.onActivate` to `onStartTrial`

- [x] **Step 1: Write failing tests**

单元测试断言 `TESTED → trial → TRIAL → activate → ACTIVE`；端到端测试完成七项检测后点击“投放试用”，进入记录页并看到“试用中”和学生试用说明。

- [x] **Step 2: Verify tests fail**

Run: `npm test -- --test-name-pattern="试用状态"`

Run: `npx playwright test tests/workflow.spec.ts --grep "检测后投放给学生试用"`

Expected: FAIL，因为没有 `TRIAL` 状态和“投放试用”入口。

- [x] **Step 3: Implement minimal state flow**

扩展状态 schema、状态标签和跳转；检测完成保留为 `TESTED`，点击“投放试用”后设为 `TRIAL` 并进入记录页。`LogsPage` 在 `TRIAL` 时显示“试用”“试用中”“打开学生端”“查看试用报告”，在 `ACTIVE` 时保留运行语义。

- [x] **Step 4: Verify tests pass**

重复 Step 2 命令，Expected: PASS。

### Task 2: 试用报告发布到公开助手库

**Files:**
- Modify: `src/hooks/useDemoPlatform.ts`
- Modify: `src/features/usage/ReportPage.tsx`
- Modify: `src/features/library/LibraryPage.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles/usage-new.css`
- Test: `tests/workflow.spec.ts`

**Interfaces:**
- Adds: `publishAssistant(id: string): void`
- `LibraryPage` consumes `assistants: TeachingAssistant[]` and `publishedCount: number`.
- `ReportPage` consumes optional `onPublish(): void` when status is `TRIAL`.

- [x] **Step 1: Write the failing test**

端到端测试进入试用报告，点击“发布到助手库”，断言打开公开详情页；返回助手库后该助手排在列表前部并可搜索，“我的助手”状态为“运行中”。

- [x] **Step 2: Verify test fails**

Run: `npx playwright test tests/workflow.spec.ts --grep "试用报告发布到助手库"`

Expected: FAIL，因为报告页没有发布动作且助手库只读取静态数据。

- [x] **Step 3: Implement publication**

`publishAssistant` 同时写入 `status: 'ACTIVE'` 与 `isPublic: true`。`ReportPage` 在试用阶段显示“试用报告”和发布按钮；`App` 合并本地公开助手与静态助手，`LibraryPage` 使用传入列表并正确增加演示总数。发布完成后导航到公开详情页。

- [x] **Step 4: Verify test passes**

重复 Step 2 命令，Expected: PASS。

### Task 3: 全量验证与浏览器检查

**Files:**
- Verify only

- [x] **Step 1: Run automated checks**

Run: `npm test`

Run: `npm run build`

Run: `npm run test:e2e`

Expected: 全部退出码为 0。

- [x] **Step 2: Inspect live flow**

在浏览器中走通“检测完成—投放试用—试用报告—发布—公开详情—助手库搜索”，确认没有教师试聊门槛、错误状态文字或横向溢出。
