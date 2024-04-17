-- CreateTable
CREATE TABLE "Mail"
(
  "id"              INTEGER  NOT NULL PRIMARY KEY AUTOINCREMENT,
  "headers"         TEXT     NOT NULL,
  "from_address"    TEXT     NOT NULL,
  "sender"          TEXT,
  "reply_to"        TEXT,
  "delivered_to"    TEXT,
  "return_path"     TEXT,
  "to_address"      TEXT     NOT NULL,
  "cc"              TEXT,
  "bcc"             TEXT,
  "subject"         TEXT,
  "message_id"      TEXT     NOT NULL,
  "in_reply_to"     TEXT,
  "reference"       TEXT,
  "date"            DATETIME,
  "html"            TEXT,
  "text"            TEXT,
  "attachments"     TEXT,
  "owner"           TEXT     NOT NULL,
  "is_read"         BOOLEAN           DEFAULT false,
  "is_important"    BOOLEAN           DEFAULT false,
  "created_at"      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_updated_at" DATETIME
);

