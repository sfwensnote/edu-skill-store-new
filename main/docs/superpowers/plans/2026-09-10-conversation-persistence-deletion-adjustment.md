# 对话恢复、助手删除与设计器调整演示 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让创建对话与技能状态一致恢复，补齐助手删除，并形成“左侧修改、右侧显示”的调整演示闭环。

**Architecture:** 保持当前 React 单页结构，把持久化与清理集中在 `useDemoPlatform`；列表只抛出删除事件，确认状态留在 `MyAssistantsPage`；调整上下文留在设计器组件中。删除确认复用已安装的 shadcn `Dialog` 和 `Button`，不新增依赖。

**Tech Stack:** React 19、TypeScript、localStorage、Radix/shadcn Dialog、Playwright。

## Global Constraints

- 只实现本地 Demo，不新增后端接口或回收站。
- 保持当前视觉系统、路由和双栏创建结构。
- 所有界面文案使用简体中文。
- 当前目录没有 Git 元数据，因此本计划不包含提交步骤。

---

### Task 1: 对话持久化与完整清理

**Files:**
- Modify: `src/hooks/useDemoPlatform.ts`
- Test: `tests/workflow.spec.ts`

**Interfaces:**
- Produces: `removeAssistant(id: string): void`
- Persists: `Record<string, DesignerMessage[]>` keyed by assistant ID

- [x] **Step 1: Write the failing test**

新增 Playwright 用例：创建一项技能后刷新，同一条教师消息、设计器回复和技能都存在。

- [x] **Step 2: Run test to verify it fails**

Run: `npx playwright test tests/workflow.spec.ts --grep "重新进入创建页恢复对话和技能"`

Expected: FAIL，因为刷新后教师消息消失。

- [x] **Step 3: Write minimal implementation**

为 `messagesByAssistant` 增加独立存储键和容错加载函数；状态变化时写入本地存储。实现 `removeAssistant`，一次删除助手及其对话、排除技能记录；允许助手数组为空而不回退到初始样例。

- [x] **Step 4: Run test to verify it passes**

Run: `npx playwright test tests/workflow.spec.ts --grep "重新进入创建页恢复对话和技能"`

Expected: PASS。

### Task 2: 我的助手删除交互

**Files:**
- Modify: `src/features/library/AssistantList.tsx`
- Modify: `src/features/library/MyAssistantsPage.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles/library-new.css`
- Modify: `src/styles/responsive-new.css`
- Test: `tests/workflow.spec.ts`

**Interfaces:**
- `AssistantList` consumes optional `onDelete(assistantId: string)`.
- `MyAssistantsPage` consumes `onDelete(assistantId: string)` and owns pending confirmation state.

- [x] **Step 1: Write the failing test**

新增 Playwright 用例：取消删除不改变数量；确认删除后名称和数量更新；删除按钮不触发路由跳转。

- [x] **Step 2: Run test to verify it fails**

Run: `npx playwright test tests/workflow.spec.ts --grep "我的助手支持确认删除"`

Expected: FAIL，因为页面没有“删除助手”按钮。

- [x] **Step 3: Write minimal implementation**

把列表行拆成主体按钮与独立删除按钮；在 `MyAssistantsPage` 使用受控 `Dialog` 显示助手名称、取消和确认删除；由 `App` 连接 `platform.removeAssistant`。样式保持现有列表密度，移动端删除触控区域不小于 44px。

- [x] **Step 4: Run test to verify it passes**

Run: `npx playwright test tests/workflow.spec.ts --grep "我的助手支持确认删除"`

Expected: PASS。

### Task 3: 让设计器调整演示

**Files:**
- Modify: `src/features/designer/DesignerChat.tsx`
- Modify: `src/features/designer/DesignerPage.tsx`
- Modify: `src/features/designer/AssistantDraft.tsx`
- Modify: `src/features/designer/SkillSection.tsx`
- Modify: `src/hooks/useDemoPlatform.ts`
- Modify: `src/styles/designer-new.css`
- Test: `tests/workflow.spec.ts`

**Interfaces:**
- `DesignerChat` shows an adjustment example when `adjustingSkill` is set.
- `DesignerPage` returns mobile users to the draft after sending an adjustment.

- [x] **Step 1: Write the failing test**

新增 Playwright 用例：点击“让设计器调整”，点击示例并发送，右侧对应技能新增“第二次仍无法继续”的具体提示；刷新后对话和修改仍存在。

- [x] **Step 2: Run test to verify it fails**

Run: `npx playwright test tests/workflow.spec.ts --grep "设计器调整会更新右侧技能"`

Expected: FAIL，因为调整状态下没有可点击示例，且对话刷新后丢失。

- [x] **Step 3: Write minimal implementation**

在调整状态提供一条示例填入按钮；沿用现有技能更新逻辑写入步骤；发送后保持目标技能展开，移动端切到设计稿。只增加短暂的既有主色轮廓反馈，不增加卡片或新色彩。

- [x] **Step 4: Run test to verify it passes**

Run: `npx playwright test tests/workflow.spec.ts --grep "设计器调整会更新右侧技能"`

Expected: PASS。

### Task 4: 全量验证与浏览器检查

**Files:**
- Verify only

- [x] **Step 1: Run all automated checks**

Run: `npm test`

Run: `npm run build`

Run: `npm run test:e2e`

Expected: 全部命令退出码为 0。

- [x] **Step 2: Inspect the running UI**

在 `http://127.0.0.1:5173` 检查桌面创建页、刷新恢复、调整闭环、删除确认和移动端触控；确认无误触、溢出或失焦。
