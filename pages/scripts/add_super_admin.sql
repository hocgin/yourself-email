-- 超级管理员
INSERT INTO UserConfig(email, is_super_admin, read_mail, sent_mail)
VALUES ('hocgin@gmail.com', true, '*', '*');

-- 默认权限
INSERT INTO UserConfig(email, is_super_admin, read_mail, sent_mail)
VALUES ('*', true, 'test@hocg.in', 'test@hocg.in');

