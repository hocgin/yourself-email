import {Paging, Scroll, ScrollRo} from "@hocgin/nextjs-kit";

export interface IMail {
  address: string;
  name: string;
  icon?: string;

  [key: string]: any
}

export interface Mail {
  id: string,
  headers: Record<string, string>[],
  fromAddress: IMail,
  sender: IMail,
  replyTo: IMail[],
  toAddress: IMail[],
  cc: IMail[],
  bcc: IMail[],
  returnPath: string,
  deliveredTo: string,
  subject: string,
  messageId: string,
  inReplyTo: string,
  reference: string,
  date: string,
  html: string,
  text: string,
  attachments: string[],
  isRead: boolean,
  isImportant: boolean,
  createdAt: string,
  lastUpdatedAt: string,
  unreadCount: number;
  labels?: string[];
}


export type ListAccountVo = IMail[];

export interface QueryMailScrollRo extends ScrollRo {
  owner: string;
  keyword?: string;
  onlyUnread?: boolean;
}

export interface QueryHistoryScrollRo extends ScrollRo {
  keyword?: string;
  fromAddress?: string;
}

export interface SendMailRo {
  from: IMail
  to: IMail[];
  subject: string
  html?: string
  attachments?: string
}
