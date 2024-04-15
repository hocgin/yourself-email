import {Paging, Scroll, ScrollRo} from "@hocgin/nextjs-kit";

export interface QueryMailScrollRo extends ScrollRo {
  keyword?: string;
}
