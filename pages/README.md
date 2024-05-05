# yourself-email

### Prod

First, run the development server:

```shell
npx wrangler d1 create yourself-email

# change with wrangler.toml > [[d1_databases]]

npx wrangler d1 migrations apply yourself-email --remote

npm run deploy


# add super admin account
npx wrangler d1 execute yourself-email --remote --command "INSERT INTO UserConfig(email, is_super_admin, read_mail, sent_mail) VALUES ('hocgin@gmail.com', true, '*', '*')";
# add default account permission
npx wrangler d1 execute yourself-email --remote --command "INSERT INTO UserConfig(email, is_super_admin, read_mail, sent_mail) VALUES ('*', false, 'test@hocg.in', 'test@hocg.in')";

```

### Dev

```shell
npx wrangler d1 migrations apply yourself-email --local

sh ./scripts/sync_remote_data.sh
```
