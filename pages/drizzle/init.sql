-- 创建 user_config 表
CREATE TABLE IF NOT EXISTS user_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  is_super_admin INTEGER DEFAULT 0,
  read_mail TEXT,
  sent_mail TEXT,
  created_at INTEGER NOT NULL,
  last_updated_at INTEGER
);

-- 创建 mail 表
CREATE TABLE IF NOT EXISTS mail (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  headers TEXT NOT NULL,
  from_address TEXT NOT NULL,
  sender TEXT,
  reply_to TEXT,
  delivered_to TEXT,
  return_path TEXT,
  to_address TEXT NOT NULL,
  cc TEXT,
  bcc TEXT,
  subject TEXT,
  message_id TEXT NOT NULL,
  in_reply_to TEXT,
  reference TEXT,
  date INTEGER,
  html TEXT,
  text TEXT,
  attachments TEXT,
  owner TEXT NOT NULL,
  is_receive INTEGER DEFAULT 1,
  is_read INTEGER DEFAULT 0,
  is_archive INTEGER DEFAULT 0,
  is_trash INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  last_updated_at INTEGER
);

-- 创建默认超级管理员用户 (如果不存在)
INSERT OR IGNORE INTO user_config (email, is_super_admin, read_mail, sent_mail, created_at)
VALUES ('*', 1, '*', '*', 0);
