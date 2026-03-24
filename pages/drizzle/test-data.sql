-- 插入测试用户配置
INSERT OR REPLACE INTO user_config (email, is_super_admin, read_mail, sent_mail, created_at)
VALUES ('hocgin@gmail.com', 1, '*', '*', 1710000000000);

-- 插入一些测试邮件数据
INSERT OR REPLACE INTO mail (
  headers, from_address, to_address, subject, message_id, owner,
  is_read, is_receive, created_at
)
VALUES (
  '[]',
  '{"address":"test@example.com","name":"Test User"}',
  '[{"address":"hocgin@gmail.com","name":"Hocgin"}]',
  'Test Email Subject',
  'test-message-id-1',
  'hocgin@gmail.com',
  0,
  1,
  1710000000000
);
