# B 方案六步重设计 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将当前混合的单页创建与旧六步导航重构为严格相邻跳转的六步教师工作流，并应用 B「教师工作台」视觉。

**Architecture:** 在 `shared/workflow.ts` 集中管理完成检查点、可访问步骤与历史项目恢复；六个页面只负责本步骤数据与继续事件。桌面使用流程侧栏和宽幅单栏文档主区，移动端自动折叠为顶部导航和单列内容。

**Tech Stack:** React 19、TypeScript、Vite、shadcn/Radix、Playwright、Node test runner。

## Global Constraints

- 流程固定为教学需求、功能解析、能力确认、教学材料、检测与试用、确认使用。
- 主按钮只能进入相邻下一步，未完成的未来步骤不可访问。
- 桌面与手机均使用单列主任务，桌面保留固定流程侧栏。
- 复用现有 API、材料解析、账户、模型调用与报告逻辑。
- 不保留旧的单页创建入口。
- 当前目录不是 Git 仓库，各任务以测试通过作为检查点，不执行提交。

---

### Task 1: 工作流状态与恢复逻辑

**Files:**
- Create: `shared/workflow.ts`
- Modify: `shared/schema.ts`
- Modify: `shared/domain.ts`
- Modify: `src/hooks/useWorkspace.ts`
- Test: `tests/workflow-state.test.ts`

**Interfaces:**
- Produces: `WorkflowStep = 0 | 1 | 2 | 3 | 4 | 5`
- Produces: `normalizeProject(project): Project`
- Produces: `getResumeStep(project): WorkflowStep`
- Produces: `canOpenStep(project, step): boolean`
- Produces: `completeThrough(project, completed): Project`

- [ ] **Step 1: 写失败测试**

```ts
test('新项目只能打开第一步，完成一步后只开放相邻下一步', () => {
  const project = emptyProject();
  assert.equal(getResumeStep(project), 0);
  assert.equal(canOpenStep(project, 1), false);
  const analyzed = completeThrough({ ...project, brief, skills }, 1);
  assert.equal(getResumeStep(analyzed), 1);
  assert.equal(canOpenStep(analyzed, 2), false);
});

test('旧项目按真实数据迁移，项目切换不重置进度', () => {
  const legacy = createAgent({ ...ready(), completedThrough: undefined } as unknown as Project);
  assert.equal(normalizeProject(legacy).completedThrough, 4);
  assert.equal(getResumeStep(normalizeProject(legacy)), 4);
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npx tsx --test tests/workflow-state.test.ts`  
Expected: FAIL，提示 `shared/workflow.ts` 不存在。

- [ ] **Step 3: 实现最小状态机**

```ts
export type WorkflowStep = 0 | 1 | 2 | 3 | 4 | 5;

export function getResumeStep(project: Project): WorkflowStep {
  return Math.min(project.completedThrough, 5) as WorkflowStep;
}

export function canOpenStep(project: Project, step: WorkflowStep): boolean {
  return step <= getResumeStep(project);
}

export function completeThrough(project: Project, completed: number): Project {
  return { ...project, completedThrough: Math.max(project.completedThrough, completed) };
}
```

补充 `normalizeProject` 的保守旧数据迁移，并在 `emptyProject` 中设置 `completedThrough: 0`。`invalidate` 接受调用方传入的回退检查点，不自动跳页。

- [ ] **Step 4: 运行状态测试与领域测试**

Run: `npx tsx --test tests/workflow-state.test.ts tests/domain.test.ts`  
Expected: PASS。

---

### Task 2: 六步页面职责与相邻跳转

**Files:**
- Create: `src/pages/Analysis.tsx`
- Modify: `src/pages/Need.tsx`
- Modify: `src/pages/Skills.tsx`
- Modify: `src/pages/Materials.tsx`
- Modify: `src/pages/Testing.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/Navigation.tsx`
- Test: `tests/workflow.spec.ts`

**Interfaces:**
- Consumes: Task 1 的 `WorkflowStep`、`getResumeStep`、`canOpenStep`、`completeThrough`
- Produces: 六个索引为 0–5 的严格步骤页面

- [ ] **Step 1: 将端到端测试改成六步失败测试**

```ts
await page.getByRole('button', { name: '分析教学需求' }).click();
await expect(page.getByRole('heading', { name: '确认系统对教学需求的理解' })).toBeVisible();
await page.getByRole('button', { name: '确认解析并继续' }).click();
await expect(page.getByRole('heading', { name: '确认助手能力' })).toBeVisible();
await page.getByRole('button', { name: '确认能力并继续' }).click();
await expect(page.getByRole('heading', { name: '添加教学材料' })).toBeVisible();
await page.getByRole('button', { name: '生成智能体并继续' }).click();
await expect(page.getByRole('heading', { name: '检测与试用' })).toBeVisible();
```

同时增加：点击未来步骤禁用；刷新恢复当前步骤；打开已生成历史项目进入第 5 步。

- [ ] **Step 2: 运行 Playwright 并确认旧页面断言失败**

Run: `npx playwright test tests/workflow.spec.ts --grep "六步"`  
Expected: FAIL，找不到新的第二步标题。

- [ ] **Step 3: 拆分页面并接入相邻继续事件**

`Analysis.tsx` 只编辑四项 `Brief`。`Skills.tsx` 删除需求解析面板。`Materials.tsx` 在材料有效时调用 `generate`，生成 Agent 后完成第 4 步并导航到索引 4。删除 `Studio` 和 `AgentPage` 在 `App.tsx` 中的入口。

`App.tsx` 使用具名步骤处理器：

```ts
function openStep(target: WorkflowStep) {
  if (!canOpenStep(p, target)) return;
  setStep(target);
  setPage('builder');
  window.scrollTo({ top: 0 });
}
```

项目切换时执行 `setStep(getResumeStep(nextProject))`，不再无条件 `setStep(0)`。

- [ ] **Step 4: 运行六步 E2E**

Run: `npx playwright test tests/workflow.spec.ts --grep "六步"`  
Expected: PASS。

---

### Task 3: B「教师工作台」视觉系统

**Files:**
- Create: `src/components/WorkflowShell.tsx`
- Create: `src/styles/workflow-v2.css`
- Modify: `src/components/Navigation.tsx`
- Modify: `src/components/Primitives.tsx`
- Modify: `src/styles/base.css`
- Modify: `src/styles/workspace.css`
- Modify: `index.html`
- Test: `tests/workflow.spec.ts`

**Interfaces:**
- Consumes: 当前步骤、项目、步骤页面内容、返回与继续按钮
- Produces: 桌面宽幅单栏任务布局与 390px 单列布局

- [ ] **Step 1: 增加视觉结构断言**

```ts
await expect(page.getByRole('navigation', { name: '创建进度' })).toBeVisible();
await expect(page.locator('.workflow-stage')).toHaveCSS('display', 'block');
expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
```

- [ ] **Step 2: 运行结构测试并确认失败**

Run: `npx playwright test tests/workflow.spec.ts --grep "B 方案"`  
Expected: FAIL，找不到 `创建进度`。

- [ ] **Step 3: 实现视觉骨架与 tokens**

`WorkflowShell` 使用：

```tsx
<div className="workflow-stage">
  <section className="workflow-task">{children}</section>
</div>
```

CSS 桌面使用 286px 流程侧栏，并在主区使用宽幅单栏文档布局；900px 以下改为顶部导航和单列。主按钮使用墨色，教学状态使用深绿。所有页面主按钮统一由 `Footer` 提供，页面内部操作使用次级样式。

- [ ] **Step 4: 运行桌面与手机视觉流程测试**

Run: `npx playwright test tests/workflow.spec.ts`  
Expected: 1440px 与 390px 均 PASS，并生成六步关键截图。

---

### Task 4: 全量回归与文档同步

**Files:**
- Modify: `PRODUCT.md`
- Modify: `DESIGN.md`
- Modify: `README.md`（仅当运行说明与页面名称不一致）
- Test: `tests/*.test.ts`
- Test: `tests/workflow.spec.ts`

**Interfaces:**
- Consumes: Tasks 1–3 的最终实现
- Produces: 可构建、可回归、文档一致的 Demo

- [ ] **Step 1: 更新产品与设计文档**

明确记录六步名称、B 视觉、`completedThrough` 和历史项目恢复规则，删除单页双栏为当前方案的表述。

- [ ] **Step 2: 运行完整验证**

Run: `npm run build && npm test && npm run test:e2e`  
Expected: TypeScript 构建通过，全部单元测试与 6 个以上 E2E 测试通过。

- [ ] **Step 3: 运行界面检测并检查截图**

Run: `npx impeccable detect http://localhost:5173`  
Expected: 无低对比、横向溢出、重复主操作等实质问题；常见系统字体提示可忽略，因为这是已确认要求。

- [ ] **Step 4: 核对最终跳转矩阵**

手动验证新建、逐步继续、返回已完成步骤、刷新、打开历史项目、修改上游内容六种路径，全部符合规范后完成交付。
