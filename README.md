<div align="center">
  <img src="./docs/logo.png" alt="onedrive-cf-index-ng" width="250px" />
  <h3><a href="/">yourself-email</a></h3>
  <p><em>Use Cloudflare to build your own email system, no servers required</em></p>

  <a href="https://deploy.workers.cloudflare.com/?url=https://github.com/hocgin/yourself-email">
    <img height="20" src="https://deploy.workers.cloudflare.com/button" alt="Deploy" />
  </a>
  <img src="https://img.shields.io/badge/Cloudflare-f38020?style=flat&logo=Cloudflare&logoColor=white" alt="Cloudflare" />
  <a href="https://github.com/hocgin/yourself-email/blob/main/README-zh-CN.md"><img src="https://img.shields.io/badge/中文-black?title=en&style=flat&logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAABmJLR0QA/wD/AP+gvaeTAAABeUlEQVRIie2VwUrDQBCGZ5ZubNmS0Ba9tF6CUqTHpg+g+AhCn8R30DfpM3jRezdHoZJroaBJQ2qgsIEdD7YSsCtJVBTxP87u/t/u7M4swDcLTQNSSseyLFbERCmlPc9LCgF83z/jnE9s294vvk+AJEmesiwbe553awQEQbCXZVnY7/ebjBXa/Ju01jCbzVIA6AwGA7WN1/KT4jg+6vV6TcYYpGlKq9UKiQgAAOr1OnU6HWNKGWPQarWa8/n8GADudwIQ0UJ89QjDEKMoOiEitRm7tm37gnNuPAUiAiJa+VjNNJmIYDgcPiAiAQD4vh9tT1NG5RJdQT8PkFKak/5ZgJTyUgjxPJ1Ob4josArAeMmWZYHrulftdhvX6/X5YrEwPtFKgG63C7ApxEajga7rVvH/BZf8D/hjACJSVRpabj1su+9OgBAiiOM41VqXNtdaw3K5TIUQQT7+rjqllKec84njOAdlAEmSPCqlxqPR6O5DQA70JZ/+t+sFAb2R22dSZ7wAAAAASUVORK5CYII=" alt="Documentation" /></a>
  <a href="https://github.com/hocgin/yourself-email/blob/main/README.md"><img src="https://img.shields.io/badge/English-black?title=en&style=flat&logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAABmJLR0QA/wD/AP+gvaeTAAABeUlEQVRIie2VwUrDQBCGZ5ZubNmS0Ba9tF6CUqTHpg+g+AhCn8R30DfpM3jRezdHoZJroaBJQ2qgsIEdD7YSsCtJVBTxP87u/t/u7M4swDcLTQNSSseyLFbERCmlPc9LCgF83z/jnE9s294vvk+AJEmesiwbe553awQEQbCXZVnY7/ebjBXa/Ju01jCbzVIA6AwGA7WN1/KT4jg+6vV6TcYYpGlKq9UKiQgAAOr1OnU6HWNKGWPQarWa8/n8GADudwIQ0UJ89QjDEKMoOiEitRm7tm37gnNuPAUiAiJa+VjNNJmIYDgcPiAiAQD4vh9tT1NG5RJdQT8PkFKak/5ZgJTyUgjxPJ1Ob4josArAeMmWZYHrulftdhvX6/X5YrEwPtFKgG63C7ApxEajga7rVvH/BZf8D/hjACJSVRpabj1su+9OgBAiiOM41VqXNtdaw3K5TIUQQT7+rjqllKec84njOAdlAEmSPCqlxqPR6O5DQA70JZ/+t+sFAb2R22dSZ7wAAAAASUVORK5CYII=" alt="Documentation" /></a>
</div>

### Show Demo

> Demo address: http://mail.hocg.in, Log in using any of your email addresses.
>
> Default permissions have been configured. After logging in, you can read/send emails: test@hocg.in 和 test2@hocg.in

<div style="display:inline-block">
  <img src="docs/tutorial/demo.c1.png" width="45%"/>
  <img src="docs/tutorial/demo.c2.png" width="45%"/>
</div>

### Deployment

**Scheme 1** [One-click Deployment(≈5min)](./docs/One-clickDeployment.md)

**Scheme 2** [Manual Deployment(≈30min)](./docs/ManualTutorial.md)

### ToDoList

<details>

<summary>ToDoList</summary>

- [x] Mark as read
- [x] Archive
- [x] Recycle Bin
- [ ] Recycle bin, complete deletion
- [ ] Add labels to emails
- [ ] Email details, the sender displays the email header information
- [x] Email details, query communication history with user X
- [x] Permission design and implementation
- [x] User status, query the unread quantity and authorized account list
- [ ] Support rich text editor
- [ ] Organize/Develop API interface
- [x] Mobile support

</details>

----

### Ref

- [Shadcn UI](https://ui.shadcn.com/)
- [Prisma](https://www.prisma.io)
- [Cloudflare D1](https://developers.cloudflare.com/d1/build-with-d1)
- [MailChannels API](https://api.mailchannels.net/tx/v1/documentation)

