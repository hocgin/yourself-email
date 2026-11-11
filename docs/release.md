# v2 发布记录

发布日期：2026-11-11（Asia/Singapore）。代码分支：`codex/refactor-project`。

- 应用：https://yourself-email-v2.hocgin.workers.dev
- Worker：`yourself-email-v2`
- Cloudflare Account ID：配置于 GitHub Secret `CLOUDFLARE_ACCOUNT_ID`，不入库。
- 新 D1：`yourself-email-v2`，ID 配置于 GitHub Variable `D1_DATABASE_ID`，已应用 `0001_initial.sql` 和 `0002_reply_to.sql`。
- 私有 R2：`yourself-email-v2`，未启用公开访问。
- 初次发布版本：`83a82f76-3ca2-4cba-9331-a3d302b18aca`。
- Dove SSO 独立 Web 客户端：`Yourself Mail`，回调为应用域名的 `/api/auth/callback`，仅请求 `openid profile email`。
- Client Secret 已通过 secrets file 随 Worker 版本上传，未写入源码、Git 或日志。

## 线上验证

- `/health` 返回 200 和 `{"status":"ok"}`。
- 未登录访问 `/api/me` 返回 401。
- 浏览器完成真实 Dove SSO 授权码登录；返回管理员用户（`ADMIN_EMAIL` 配置的账号），`emailVerified: true`、`isAdmin: true`。
- 已验证管理员域名管理页面可访问。
- 发布前 45 项 workerd 集成测试、严格类型检查和 Vite 构建通过。

## 保留项

旧 Worker、旧数据库、现有 Web 自定义域名及 Email Routing 规则均保留；此次发布未切换旧域名流量，也未将旧权限或历史邮件迁入新库。

新库从空域名、空邮箱开始。管理员登录后，按部署指南添加域名和邮箱，再将选定域名的路由指向新 Worker。真实邮件投递、外部收件及附件传输需在域名接入后验证。

## 2026-11-12 登录页右侧视觉更新

- 发布目标：`yourself-email-v2`，现有 Cloudflare 账号与资源。
- 版本：`63216f27-b34e-4643-8f8b-4e7b7d1532b7`。
- 发布当前工作区前端版本，包含选定方案 2 的邮箱格插画；保留现有环境变量与 Secret。无数据库迁移。
- 类型检查、53 项测试、生产构建和部署 dry-run 通过。
- 线上 `/health` 200，未登录 `/api/me` 401；插画资源 SHA-256 与本地完全相同。
- 浏览器确认登录页和新插画加载；桌面截图 `docs/design/login-right-v2/production-desktop.png`。未重复执行真实 SSO 登录或邮件投递。
