# yourself-email


### Prod
First, run the development server:

```shell
npx wrangler d1 create yourself-email

# change with wrangler.toml > [[d1_databases]]

npx wrangler d1 migrations apply yourself-email --remote

npm run deploy
```


### Dev

```shell
npx wrangler d1 migrations apply yourself-email --local

sh ./scripts/sync_remote_data.sh
```
