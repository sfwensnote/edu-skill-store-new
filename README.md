# 教学工坊

完整应用位于 [main/](main/)，产品说明、源码和测试均在其中。

```sh
cd main
npm ci
npm run dev
```

本地预览：[教学工坊](http://127.0.0.1:5173/#/home)。使用 Node.js 24，已验证版本 24.13.0。

Windows 真实前后端部署：双击仓库根目录的 **启动教学工坊.cmd**，首次在本机输入中转密钥，然后使用本机网页注册教师。配置、局域网试用和数据说明见 [Windows 本机部署](main/docs/Windows本机部署.md)。

- [项目开发规则](AGENTS.md)
- [当前功能与任务交接](HANDOFF.md)
- [Windows 运行与私有数据迁移](WINDOWS.md)
- [本轮迁移检查报告](MIGRATION_REPORT.md)
- [完整迁移文件清单](MIGRATION_FILES.txt)
- [应用详细说明](main/README.md)

目标仓库：[edu-skill-store-with-pbl](https://github.com/sfwensnote/edu-skill-store-with-pbl)。代码、依赖锁进入版本管理；数据库、密钥、浏览器备份及本机依赖不上传。

## GitHub Actions 网站部署

网站地址：[教学工坊](https://sfwensnote.github.io/edu-skill-store-with-pbl/#/home)。

[Pages 部署工作流](https://github.com/sfwensnote/edu-skill-store-with-pbl/actions/workflows/pages.yml) 在推送 `main` 时安装锁定依赖、运行测试、检查类型并构建，只将 `main/dist` 上传到 GitHub Pages。也可在 Actions 页面手动运行。

仓库首次部署需在 Settings → Pages → Build and deployment 中将 Source 设置为 **GitHub Actions**。部署成功后可直接访问网站；后续推送 `main` 自动更新。项目使用哈希路由，图片与脚本按仓库子路径加载。

Pages 只托管静态前端，不能运行 Express、SQLite、身份和模型服务。本机部署或配置独立 HTTPS 后端后才能使用真实检测、学生试用和报告；编辑工作区与集市仍属于浏览器。网站发布不会上传教师作品、密钥或数据库。

## GitHub Release 下载包

[发布工作流](https://github.com/sfwensnote/edu-skill-store-with-pbl/actions/workflows/release.yml) 在推送 `v*` 标签时验证版本、安装锁定依赖、运行单元与集成测试、检查类型并构建，随后创建 [GitHub Release](https://github.com/sfwensnote/edu-skill-store-with-pbl/releases)。也可在 Actions 页面手动选择已存在的版本标签运行。

下载包包含源码和前端生产构建，附 SHA-256 校验文件；安装依赖后从 `main/` 启动。每次发布需先更新 `main/package.json` 与锁文件中的版本，并准备 `.github/release-notes/v版本号.md`，然后推送对应标签。已发布版本不覆盖，修订使用新版本号。

当前代码包含真实模型检测、受控学生试用和证据报告，实际运行需要本项目后端及私有模型配置。源码和下载包不会同步教师作品。完整功能与实现边界见 [产品说明](main/PRODUCT.md)。
