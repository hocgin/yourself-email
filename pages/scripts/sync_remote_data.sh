#!/usr/bin/env bash
DB_NAME=yourself-email
path=$(cd `dirname $0`; cd ..; pwd)


# 导出远程数据库数据
npx wrangler d1 export $DB_NAME --table=Mail --no-schema=true --remote --output "$path/scripts/sync_remote_data.sql"

# 清空本地数据库
npx wrangler d1 execute $DB_NAME --local --command "TRUNCATE TABLE Mail"

# 恢复数据到本地数据库
npx wrangler d1 execute $DB_NAME --local --file="$path/scripts/sync_remote_data.sql"


