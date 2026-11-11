# 架构与 API

`workers/src/index.ts` 是唯一入口，导出 HTTP `fetch`、收件 `email` 和清理 `scheduled`。Vite 构建 React 静态资源和 Worker，Hono 提供 API，Drizzle 使用 D1。全部资源访问在 Worker 内完成，R2 不公开。

## 数据

- `users`：规范化邮箱、验证状态及可空的 issuer/sub 身份。管理员预配置账号先不绑定，只有已验证 SSO 身份可以首次认领；绑定后不根据邮箱重新认领。
- `domains / mailboxes / mailbox_grants`：域名、手动或首次来信自动创建的邮箱、独立读写授权。域名和邮箱仅停用，不提供破坏历史关联的删除功能。
- `sessions / login_transactions`：随机令牌仅保存 SHA-256；登录事务 10 分钟、消费一次，业务会话 24 小时。
- `messages`：邮箱归属、地址、主题、250 字摘要、共享状态、R2 引用与发送状态。D1 不存大正文或附件。搜索主题、摘要和联系人，不对完整 R2 正文做全文检索。
- `attachments`：归属邮箱、上传账号、可空邮件 ID、私有对象 key、文件元数据。被发送使用的附件只能按邮件读权限访问；发送权限不足以下载历史附件。
- `send_requests`：账号内唯一幂等键、请求摘要和关联邮件。

邮箱地址、登录邮箱转小写并去首尾空格；ID 使用随机 UUID。入站记录使用邮箱 ID 和原始 Message-ID／原文摘要生成稳定 ID，附件采用稳定对象键。相同邮件投递到不同邮箱时分别记录。

## HTTP 接口

成功响应 `{data: ...}`，失败响应 `{error:{code,message}}`。写请求必须携带与 APP_URL 一致的 Origin。Cookie 会话鉴权，所有 API 和附件返回 `Cache-Control: no-store`。不支持旧 API。

| 路径 | 方法 | 用途 |
| --- | --- | --- |
| `/api/auth/login` | GET | 发起 OIDC 登录 |
| `/api/auth/callback` | GET | 消费事务、交换授权码、验证 ID Token/UserInfo 并建立会话 |
| `/api/auth/logout` | POST | 撤销当前业务会话 |
| `/api/me` | GET | 登录身份和管理员状态 |
| `/api/mailboxes` | GET | 当前用户的邮箱、有效读写权限和未读数 |
| `/api/messages` | GET | `mailboxId, folder, q, unread, cursor` 查询；每页 30 条 |
| `/api/messages/:id` | GET / PATCH | 详情或修改 `isRead,isArchive,isTrash` |
| `/api/messages/:id/history` | GET | 此邮箱与当前对方联系人的往来记录，支持 cursor |
| `/api/messages/send` | POST | 发信；必须有 UUID `Idempotency-Key` 请求头 |
| `/api/messages/send/:id` | GET | 当前账号本次发送请求状态，不暴露邮件正文 |
| `/api/attachments` | POST | multipart `mailboxId` 和 `file` 上传 |
| `/api/attachments/:id` | GET | 经实时授权的附件下载 |
| `/api/admin/domains` | GET / POST | 列表／新增域名 |
| `/api/admin/domains/:id` | PATCH | 设置 `enabled` |
| `/api/admin/mailboxes` | GET / POST | 列表／创建邮箱 |
| `/api/admin/mailboxes/:id` | PATCH | 设置 `name,enabled` |
| `/api/admin/accounts` | GET | 包括待绑定账号的授权列表 |
| `/api/admin/accounts/grants` | PUT | 按 `email` 原子替换多个邮箱读写授权 |
| `/health` | GET | 运行健康检查，不代表外部 SSO/邮件投递健康 |

发送请求字段：`mailboxId,to,cc,bcc,subject,text,html?,attachmentIds,replyToId?`；收件地址结构为 `{email,name?}`，发件地址从已授权邮箱读取，不能伪造。回复需要原邮件读权限及同邮箱发权限。

## 失败语义

- 收件：按信封地址确定归属；启用域名下的未知地址在大小检查与 MIME 解析成功后自动建箱，地址唯一约束保证并发投递复用同一邮箱；不创建账号授权，管理员可通过现有接口管理和收发。未接入域名、停用域名及停用邮箱拒收。R2 写入完成后原子提交邮件及附件的 D1 记录，错误抛给运行时，不吞异常。重试写入确定对象键，数据库去重。没有 Message-ID 时使用原文摘要。
- 发件：先原子预留消息和幂等记录，再认领附件、保存正文、调用 EMAIL。已接受记录平台 ID；明确拒绝标记 failed，释放附件供人工重试；网络／运行时异常标记 unknown，不自动重发。
- pending 超过两分钟在状态查询／定时清理中转 unknown；重复键只返回现有请求，改变请求内容则返回冲突。
- R2 与 D1 不存在跨服务事务。入站失败可能保留自动创建的空邮箱及确定键对象，后续同邮件重试可复用；已发送后 D1 更新失败可能只能记录 unknown，不能据此断言未发出。
- Cron 每小时清理最多 500 个过期孤立上传和过期会话／事务；保留历史邮件及附件。
- 正文 HTML 在后端清理，iframe sandbox 禁止脚本；远程图片移除，CID 图片由前端鉴权下载后替换为临时 blob URL。
