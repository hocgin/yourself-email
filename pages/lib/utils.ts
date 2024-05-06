import {type ClassValue, clsx} from "clsx"
import formatDistanceToNow from "date-fns/formatDistanceToNow";
import {twMerge} from "tailwind-merge"
import format from "date-fns/format";
import {stripHtml as _stripHtml} from "string-strip-html";
import sanitizeHtml, {IOptions} from 'sanitize-html';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function join(arr: string[] = [], separator: string = ',') {
  return arr.join(separator)
}

export function unique<T>(arr: T[] = []): T[] {
  return [...new Set<T>(arr)];
}

export function formatDistanceDay(date: Date): string {
  const oneDay = 1000 * 3600 * 24;
  const distance = Date.now() - date.getTime();
  if (distance < oneDay && distance > 0) {
    return "today";
  }

  if (distance > 7 * oneDay) {
    return format(date, "yyyy-MM-dd HH:mm:ss");
  }

  return formatDistanceToNow(date, {addSuffix: true})
}

export function formatDate(date: Date) {
  return format(date, "yyyy-MM-dd HH:mm:ss");
}


export function stripHtml(html: string) {
  if (!html?.length) return html;
  return _stripHtml(html)?.result;
}

const defaultOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
  allowedAttributes: {
    '*': ["style"],
    td: ['*'],
    p: ['dir', '*'],
    a: ['href', 'name', 'target', 'style'],
    // We don't currently allow img itself by default, but
    // these attributes would make sense if we did.
    img: ['style', 'src', 'srcset', 'alt', 'title', 'width', 'height', 'loading']
  },
} as any;

export const sanitize = (dirty: string, options?: IOptions) => {
  return ({
    __html: sanitizeHtml(dirty, {...defaultOptions, ...options}),
  });
}

export const removeArray = (a: string[] = [], b: string[] = []) => {
  if (!b?.length) return a;
  return a.filter(item => !b.includes(item));
}
