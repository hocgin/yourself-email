import {Paging, Scroll, ScrollRo} from "@hocgin/nextjs-kit";


export interface QueryChatScrollRo extends ScrollRo {
  owner: string;
  keyword?: string;
  onlyUnread?: boolean;
}

export interface QueryMailScrollRo extends ScrollRo {
  keyword?: string;
  fromAddress?: string;
}

export interface SendMailRo {
  from?: string
  to?: string
  subject?: string
  html?: string
  attachments?: string
}
