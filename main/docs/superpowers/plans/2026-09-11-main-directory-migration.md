# Demo Main Directory Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将完整可运行 Demo 迁入 `main/`，并保持构建、测试和本地预览可用。

**Architecture:** `main/` 成为唯一应用根目录；仓库根目录只承担代理规则、技能配置和入口导航。所有运行命令从 `main/` 执行。

**Tech Stack:** React 19、TypeScript、Vite 7、Express 5、Node.js 24、Playwright

## Global Constraints

- 不改变产品功能、数据结构和界面行为。
- 不复制源码或创建第二套入口。
- 不删除用户数据和现有构建产物。

---

### Task 1: 迁移应用目录

**Files:**
- Create: `main/`
- Move: 应用源码、配置、测试、文档、图片、数据和构建产物

- [x] 创建 `main/`。
- [x] 停止占用 5173 端口的旧开发进程。
- [x] 将应用文件整体移动到 `main/`。
- [x] 确认根目录没有遗留旧入口。

### Task 2: 更新仓库入口说明

**Files:**
- Modify: `AGENTS.md`
- Modify: `.gitignore`
- Create: `README.md`

- [x] 将目录结构和命令说明改为以 `main/` 为应用根目录。
- [x] 确认忽略规则覆盖 `main/` 下的运行产物与密钥。
- [x] 在根目录写明进入 `main/` 后运行项目。

### Task 3: 验证迁移

**Files:**
- Test: `main/tests/*.test.ts`
- Test: `main/tests/workflow.spec.ts`

- [x] 在 `main/` 执行 `npm test`。
- [x] 在 `main/` 执行 `npm run build`。
- [x] 从 `main/` 重启开发服务。
- [x] 在 `main/` 执行 `npm run test:e2e`。
- [x] 检查浏览器可访问 `http://127.0.0.1:5173`。
