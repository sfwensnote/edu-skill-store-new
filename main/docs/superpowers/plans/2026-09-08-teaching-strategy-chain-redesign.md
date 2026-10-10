# 教学策略链新版前端 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将已确认的方案 A 落到现有六步 React Demo，建立清晰的教师任务重心、教学策略链和结论先行报告。

**Architecture:** 保留 `App`、六步状态机、API 与领域数据，只重组页面语义和视觉层。页面继续各自负责一步；共享壳层负责导航、页面宽度和响应式规则，CSS 按页面职责拆分。

**Tech Stack:** React 19、TypeScript、Vite、Tailwind CSS 4、shadcn/Radix、Playwright。

## Global Constraints

- 六步严格相邻跳转和现有数据契约不变。
- 教师界面只使用中文教学用语，不出现 Skill、Agent、Prompt 等术语。
- 不增加渐变、装饰插图、悬浮卡片和无意义小图标。
- 页面只保留一个主操作；移动端触控目标不低于 44px。
- 教学策略链是第三步唯一高强调区域；报告先给结论再给证据。
- 当前目录不是 Git 仓库，以测试和截图检查作为任务检查点。

---

### Task 1: 工作台骨架与教学需求输入

**Files:**
- Modify: `tests/workflow.spec.ts`
- Modify: `src/components/Navigation.tsx`
- Modify: `src/components/WorkflowShell.tsx`
- Modify: `src/pages/Need.tsx`
- Modify: `src/styles/base.css`
- Modify: `src/styles/workflow-v2.css`
- Modify: `src/styles/need.css`

**Interfaces:**
- Consumes: `WorkflowStep`、`completedThrough`、现有 `Need` 回调。
- Produces: `.need-workbench` 组合输入区、稳定桌面侧栏和紧凑移动端步骤头。

- [x] **Step 1: 写结构失败测试**

```ts
await expect(page.locator('.need-workbench')).toBeVisible();
await expect(page.locator('.input-meta')).toHaveCount(0);
```

- [x] **Step 2: 运行并确认失败**

Run: `npx playwright test tests/workflow.spec.ts --grep "新版前端结构"`
Expected: FAIL，找不到 `.need-workbench`。

- [x] **Step 3: 实现骨架与组合输入**

输入框、数学示例与“分析并生成教学方案”共用一个表面；删除字数统计、技术解释和重复提示。桌面侧栏增强比例与当前步骤，移动端只展示当前步骤和进度。

- [x] **Step 4: 运行结构测试**

Run: `npx playwright test tests/workflow.spec.ts --grep "新版前端结构"`
Expected: PASS。

---

### Task 2: 1–4 教学简报与教学策略链

**Files:**
- Modify: `src/pages/Analysis.tsx`
- Modify: `src/pages/Skills.tsx`
- Modify: `src/styles/skills.css`
- Modify: `src/styles/workflow-v2.css`
- Test: `tests/workflow.spec.ts`

**Interfaces:**
- Consumes: `Brief` 四字段与 `Project.skills`。
- Produces: `.analysis-sequence` 四项纵向编辑结构和 `.strategy-chain` 教学策略链。

- [x] **Step 1: 写结构失败测试**

```ts
await expect(page.locator('.analysis-sequence > li')).toHaveCount(4);
await expect(page.locator('.strategy-chain [data-strategy-node]')).toHaveCount(3);
```

- [x] **Step 2: 运行并确认失败**

Run: `npx playwright test tests/workflow.spec.ts --grep "新版前端结构"`
Expected: FAIL，旧页面仍为表单矩阵和列表。

- [x] **Step 3: 实现纵向简报和可选策略节点**

简报每项以编号、字段名、内容和“修改/完成”组成；策略页顶部显示教学目标，中间显示连续策略节点，下方只展示当前节点的教学作用、适用情况、引导方式与教学边界。

- [x] **Step 4: 运行流程测试**

Run: `npx playwright test tests/workflow.spec.ts --grep "新版前端结构|六步流程"`
Expected: PASS。

---

### Task 3: 材料、检测、报告与文档回归

**Files:**
- Modify: `src/pages/Materials.tsx`
- Modify: `src/pages/Testing.tsx`
- Modify: `src/components/Trial.tsx`
- Modify: `src/pages/Report.tsx`
- Modify: `src/styles/materials-agent.css`
- Modify: `src/styles/evaluation.css`
- Modify: `src/styles/report.css`
- Modify: `src/styles/responsive.css`
- Modify: `DESIGN.md`
- Modify: `docs/前端重设计.md`
- Test: `tests/workflow.spec.ts`

**Interfaces:**
- Consumes: 现有材料、检测、对话、教师判断和发布回调。
- Produces: 清晰材料列表、证据表、试用决策区和 `.report-verdict` 结论主视觉。

- [x] **Step 1: 补充报告结构断言**

```ts
await expect(page.locator('.report-verdict')).toBeVisible();
await expect(page.locator('.report-evidence')).toBeVisible();
```

- [x] **Step 2: 运行并确认失败**

Run: `npx playwright test tests/workflow.spec.ts --grep "数学样例闭环"`
Expected: FAIL，旧报告不存在新结构。

- [x] **Step 3: 完成其余页面并同步文档**

材料区以上传动作为重点；检测按“检查内容—结果—依据”组织；试用区明确聊天与教师判断；报告首屏展示结论、助手名称和下一动作，明细使用宽度、底色与留白分区。

- [x] **Step 4: 完整验证**

Run: `npm run build && npm test && npm run test:e2e`
Expected: 构建通过，10 个单元测试和全部 Playwright 测试通过，1440px 与 390px 无横向溢出。
