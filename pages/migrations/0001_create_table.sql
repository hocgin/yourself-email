-- CreateTable
CREATE TABLE "Mail"
(
  "id"          TEXT     NOT NULL PRIMARY KEY,
  "headers"     TEXT     NOT NULL,
  "fromAddress" TEXT     NOT NULL,
  "toAddress"   TEXT     NOT NULL,
  "subject"     TEXT     NOT NULL,
  "html"        TEXT     NOT NULL,
  "text"        TEXT     NOT NULL,
  "attachments" TEXT     NOT NULL,
  "date"        DATETIME NOT NULL,
  "readyFlag"   BOOLEAN  NOT NULL DEFAULT false
);

