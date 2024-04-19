# yourself-email

First, run the development server:

```bash
npx wrangler d1 create my-db

# change with wrangler.toml > [[d1_databases]]

npx wrangler d1 migrations apply my-db --remote

npm run deploy
```
