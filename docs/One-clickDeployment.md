### 操作流程
> - If the installation fails, please refer to the [Preconditions](./Reinstall-zh-CN.md)
> - Frequently Asked Questions Reference: [FAQ](./FAQ-zh-CN.md)

1. Click `fork`

![fork.png](tutorial/fork.png)

2. Click [Cloudflare Token](https://dash.cloudflare.com/profile/api-tokens), create `API Tokens`

![img.png](tutorial/token_summary.png)

3. Configure environment variables  
![set-env.png](tutorial%2Fset-env.png)
- CLOUDFLARE_API_TOKEN=from_cloudflare_token
- CLOUDFLARE_ACCOUNT_ID=from_cloudflare_account_id
- CLOUDFLARE_ZONE_NAME=example.com
- CLOUDFLARE_EMAIL_ADDRESS=xxx@gmail.com
4. trigger deployment
![trigger_action.png](tutorial%2Ftrigger_action.png)
5. Visit your email address and use the email address filled in "CLOUDFLARE_EMAIL_ADDRESS" to log in.
