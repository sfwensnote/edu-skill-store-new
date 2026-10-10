# Demo 主目录迁移设计

## 目标

将 Educational Skill Builder 的完整可运行 Demo 收拢到仓库根目录下的 `main/`，使源码、配置、测试、文档和运行数据拥有单一明确入口。

## 目录边界

- 根目录保留：`AGENTS.md`、`.agents/`、`skills-lock.json`、`.gitignore`、入口 `README.md`。
- `main/` 包含：前后端源码、共享模块、测试、构建配置、依赖清单、产品文档、参考图片、运行数据库、现有构建与测试产物。
- 不复制任何源码，不保留旧入口，避免双套代码漂移。

## 运行方式

迁移后统一在 `main/` 中执行 `npm install`、`npm run dev`、`npm test`、`npm run build` 和 `npm run test:e2e`。

## 验收标准

1. 根目录不再散落 Demo 源码与构建配置。
2. `main/` 中的单元测试、构建和端到端测试通过。
3. `http://127.0.0.1:5173` 可继续访问 Demo。
4. 根目录说明与 `AGENTS.md` 中的路径和命令准确。
