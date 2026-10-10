# 教学工坊

完整应用位于 [main/](main/)，产品说明、源码和测试均在其中。

```sh
cd main
npm ci
npm run dev
```

本地预览：[教学工坊](http://127.0.0.1:5173/#/home)。使用 Node.js 24，已验证版本 24.13.0。

- [项目开发规则](AGENTS.md)
- [当前功能与任务交接](HANDOFF.md)
- [Windows 运行与私有数据迁移](WINDOWS.md)
- [本轮迁移检查报告](MIGRATION_REPORT.md)
- [完整迁移文件清单](MIGRATION_FILES.txt)
- [应用详细说明](main/README.md)

目标仓库：[edu-skill-store-with-pbl](https://github.com/sfwensnote/edu-skill-store-with-pbl)。2026-10-10 用户已批准首次提交和推送，分支为 main；实际上传状态以 Git 记录为准。代码、依赖锁进入版本管理；数据库、密钥、浏览器备份及本机依赖不上传。
