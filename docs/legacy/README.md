# 旧部署存档

`deploy.tf` 只供查看旧 Pages、收件 Worker、D1 和 Email Routing 的资源关系。它不属于 v2 部署链路。不要对已有 Terraform state 执行 apply 或 destroy 来清理迁移；旧线上资源作为回退保留。

旧版教程已退出当前文档入口，使用 `../deployment.md`。旧版本完整源代码可通过 Git 主分支历史检索。

`sw.js.before-refactor` 和 `sw.patch` 保留了开始重构前用户未提交的 Service Worker 内容及差异；仅作备份，不会进入前端静态资源目录。
