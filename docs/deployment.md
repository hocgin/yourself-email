# Workers v2 部署指南

当前实例已发布至 https://yourself-email-v2.hocgin.workers.dev，发布资源与验证结果见 [发布记录](release.md)。以下创建资源步骤用于首次部署到新环境。

## 1. 创建全新存储

在 `workers/` 执行（不要使用旧 D1 的 ID）：

```sh
pnpm exec wrangler d1 create yourself-email-v2
pnpm exec wrangler r2 bucket create yourself-email-v2
```

把新 D1 ID 写入 `wrangler.jsonc` 的 `DB` 绑定。R2 保持私有，不启用 public development URL／公开域名。`00000000-0000-0000-0000-000000000000` 是仅用于本地开发和 dry-run 的占位 ID，生产前必须替换。初始化没有默认用户、邮箱或通配授权。

```sh
pnpm db:migrate:remote
```

兼容日期固定为 `2026-11-10`，对应本次验证所用 workerd 支持的最新日期。

## 2. 注册 Dove SSO Web 客户端

在 `https://sso.hocgin.top/admin/clients/` 使用已验证管理员身份创建 Web（保密）客户端，登记精确回调 `https://<应用域名>/api/auth/callback`，开启 `openid profile email` scopes，取得 Client ID、Client Secret 和 Resource/Audience。

- `APP_URL` 为应用 HTTPS origin，不带子路径。
- `SSO_ISSUER` 默认 `https://sso.hocgin.top/api/auth`；也可使用 `.com` 对应 issuer，每次流程固定为一个 issuer。
- `SSO_CLIENT_ID` 和 `SSO_RESOURCE` 写入 vars。
- `ADMIN_EMAIL` 指定唯一管理员的 SSO 登录邮箱；未配置或无效时无管理员。
- `SSO_CLIENT_SECRET` 通过 Wrangler Secret 或下文的 JSON secrets file 提供，不提交到仓库。
- 业务会话固定 24 小时，退出只撤销本应用会话。无刷新令牌、跨应用注销或 SSO Cookie 共享。

## 3. 构建、配置和部署

可直接编辑非敏感 Wrangler vars/bindings，也可设置 shell 环境变量 `ADMIN_EMAIL APP_URL D1_DATABASE_ID R2_BUCKET_NAME SSO_CLIENT_ID SSO_RESOURCE` 后执行 `node scripts/configure-deploy.mjs`。该脚本只生成非敏感配置。

```sh
pnpm install --frozen-lockfile
pnpm cf:types
pnpm typecheck
pnpm test
pnpm deploy:check
pnpm build
# 首次部署可用权限为 0600 的 JSON 文件原子上传 Secret：
pnpm exec wrangler deploy --secrets-file /absolute/path/mail-secrets.json
```

JSON 文件内容为 `{"SSO_CLIENT_SECRET":"实际值"}`，放在仓库外，部署后删除。已有部署也可用 `wrangler secret put SSO_CLIENT_SECRET` 交互录入；该命令会发布新版本。不要将 Secret 放进命令参数。

使用 Cloudflare 控制台为新 Worker 绑定 Web 自定义域名。先在临时应用域名验证 SSO 和权限，正式切换时同步修改 APP_URL 和 SSO 回调注册。

## 4. 连接每个邮件域名

1. 在 Cloudflare 托管 DNS。
2. 按 [Email Sending 入门](https://developers.cloudflare.com/email-service/get-started/send-emails/) 接入每个发信域名并完成 DNS 验证。后台开关不代替 Cloudflare 验证。
3. 在每个域名的 Email Routing 中启用邮件路由，Catch-all 指向新 Worker。启用中的已接入域名收到未创建地址的来信时，应用会自动创建对应普通邮箱，管理员刷新后可查看并按需授权；未接入域名、停用域名及停用邮箱仍会拒收。
4. 使用管理员登录应用，添加域名与收件地址，为用户分别分配读取、发送权限。
5. 向各域名下配置的邮箱发送真实测试邮件，并验证附件、回复及外部收件地址投递。平台日志和收件结果一起验证，不能只看 API accepted。

应用最多允许 50 个 To/Cc/Bcc 地址，单个上传 18 MiB，总邮件按保守 MIME 编码预算限制至 25 MiB。Cloudflare 账户级配额／限流仍然适用。`EMAIL` 不限制外部收件人，业务发件地址由后端邮箱授权限制。

## 5. GitHub Actions

`production` environment Variables：`ADMIN_EMAIL`、`APP_URL`、`D1_DATABASE_ID`、`R2_BUCKET_NAME`、`SSO_CLIENT_ID`、`SSO_RESOURCE`，可选 `SSO_ISSUER`。

Secrets：`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`、`SSO_CLIENT_SECRET`。Token 需要目标账号的 Workers 脚本发布、D1 迁移及 R2/Email 绑定所需权限，按 Cloudflare 对所用命令的当前权限要求配置。

PR、`codex/**`、`main` 都运行类型检查、集成测试和部署 dry-run。只在 main 且检查成功后进入 production job，应用增量迁移、构建并以 secrets file 发布。可在 GitHub environment 设置发布审批。

## 6. 切换与回退

- 完成验证后，切换 Web 自定义域名和各邮件域名的 Catch-all 路由至新 Worker。
- 保留旧 Pages／Worker 部署与旧 D1，旧 Terraform 已归档，不执行 apply/destroy。
- 回退时切回 Web 域名及收件路由；新旧数据分开保存，新库邮件不自动同步到旧库。
- 新前端将注册缓存退役脚本，清除旧 Workbox/Next PWA 缓存并注销 Service Worker。API 与附件响应禁止缓存。
- 上线后检查 Workers 日志中的 `oidc_callback_failed`、`email_send_failed`、运行时 email 失败及 R2/D1 错误；日志不包含正文、令牌和 Secret。

旧部署、旧数据库及现有邮件收件路由保留。真实域名接入后再在后台创建对应邮箱；不要把旧数据库 ID 配置给 v2。
