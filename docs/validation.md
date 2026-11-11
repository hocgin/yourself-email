# 重构验收记录

验证日期：2026-11-11（Asia/Singapore）。分支：`codex/refactor-project`。

## 自动验证

| 检查 | 结果 |
| --- | --- |
| `pnpm typecheck` | 通过；Wrangler 生成运行时类型，开启 strict、noUnusedLocals、noUnusedParameters |
| `pnpm test` | 4 个测试文件、45 项测试通过，运行于 workerd，使用本地 D1/R2 |
| `pnpm deploy:check` | Vite 前端和 Worker 构建通过，Wrangler dry-run 通过 |
| `hono request /health --runtime workerd` | 返回 200 和 `{status:"ok"}` |
| `git diff --check` | 通过 |
| 原有 Service Worker 改动 | 原文与 patch 已按字节保存在 `docs/legacy/sw.js.before-refactor` 和 `docs/legacy/sw.patch` |

主要测试覆盖：RS256 签名、nonce、issuer、audience、过期、UserInfo subject、未验证管理员邮箱、登录事务消费与重放、业务会话过期及退出；跨邮箱权限、只读与只发送、附件 ID 越权、即时撤销、共享状态；信封地址归属、未知／停用地址、Reply-To、重复来信、无 Message-ID、超大来信、R2/D1 故障；幂等及并发发送、明确拒绝、未知结果、pending 中断、附件独占与人工重试、孤立上传清理；同时间戳分页、搜索参数安全、大批邮箱授权。

生产批量授权与附件入库按 D1 参数限制切分语句，在同一 batch 中提交。所有远程发送测试使用模拟 EMAIL binding，不向外部发送邮件。

## 浏览器验证

通过 Ego Browser，先验证 Vite 开发环境，再使用 `wrangler dev --local` 验证实际构建产物及生产 CSP。登录状态由只写入本地 D1 的临时测试会话提供，未绕过生产登录接口。

- 登录页面、无会话状态和退出后返回登录页。
- 多域名邮箱切换、来信列表、正文、自动已读、会话记录。
- 撰写邮件、附件上传、本地模拟发送、平台接受状态、已发送记录及附件下载内容一致。
- 域名添加、邮箱创建、同一账号跨域邮箱的独立读写授权。
- 归档／取消归档、移入／移出垃圾箱。
- 390 × 844 手机视图：阅读与回复正常，收件人和 Re: 主题正确预填，页面宽度与滚动宽度均为 390px。

验证中修正了开发 CSP 对 Vite preamble 的阻止、授权控件的可访问名称／点击区域、手机会话列表切换、失败发送的附件复用，以及 D1 批量绑定参数限制。

## 尚需在新环境验证

初次重构验收时未创建或修改线上资源，使用本地占位配置。用户随后授权提交部署，已创建独立资源并完成真实 SSO 验证，详见 [发布记录](release.md)。未发送真实邮件。

实际 Dove SSO 登录、Cloudflare 域名验证、对外投递、真实附件传输和回复线程，须按 `deployment.md` 在新环境逐项验证。自动测试使用真实签名的模拟 OIDC Provider，不等同于线上 SSO 联调。

Miniflare 的本地邮件捕获器对 binary attachment 的支持存在限制，可能在本地 EMAIL 已返回接受结果后输出捕获警告；附件的 R2 保存、鉴权下载和 provider 调用数据已分别验证。真实 MIME 投递仍以上线前的外部收件结果为准。
