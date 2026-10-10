# Conversation Studio Implementation Plan（已废弃）

> 本计划已由 `2026-09-08-b-six-step-redesign.md` 替代，不再执行。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved conversation-first creation page with a live agent draft.

**Architecture:** Compose a focused Studio page from a chat component and a draft component. Reuse the existing design/material APIs and domain functions; keep evaluation and reporting unchanged.

**Tech Stack:** React 19, TypeScript, Vite, shadcn/Radix, Express API, Playwright.

## Global Constraints

- Natural teaching language only; no AI implementation vocabulary in teacher-facing copy.
- Desktop split 58/42; narrow screens use two tabs and default to chat.
- One visible primary action: confirm and generate.
- System font stack, warm light neutral palette, restrained borders and radii.

### Task 1: Define the creation workflow with an end-to-end test

**Files:** Modify `tests/workflow.spec.ts`.

- [ ] Assert initial chat and empty draft states.
- [ ] Assert a teacher message creates a visible teaching interpretation and skills.
- [ ] Assert material upload enables generation and generation opens evaluation.
- [ ] Run the focused test and confirm it fails because the Studio UI does not exist.

### Task 2: Build modular Studio components

**Files:** Create `src/pages/Studio.tsx`, `src/components/DesignerChat.tsx`, `src/components/AgentDraft.tsx`; modify `src/App.tsx`.

- [ ] Compose the existing shadcn Message/Bubble/MessageScroller primitives for chat.
- [ ] Render the draft progressively from existing `Project` fields.
- [ ] Reuse existing upload and sample-material handlers.
- [ ] Generate through `createAgent` only when skills and materials are ready.

### Task 3: Apply the approved visual system

**Files:** Create `src/styles/studio.css`; modify `src/styles/workspace.css`, `src/styles/base.css`, `src/styles/shell.css`, `DESIGN.md`.

- [ ] Implement the desktop split and responsive Tabs layout.
- [ ] Apply the system font stack and restrained warm-neutral tokens.
- [ ] Preserve focus, loading, disabled, error, empty and reduced-motion states.

### Task 4: Verify and finish

**Files:** Modify tests only if old selectors describe the replaced UI.

- [ ] Run build, unit tests and all Playwright tests.
- [ ] Capture 1440px and 390px screenshots and inspect once.
- [ ] Run the Impeccable detector once over changed UI targets.
- [ ] Fix material findings in one batch, rerun verification, and stop.
