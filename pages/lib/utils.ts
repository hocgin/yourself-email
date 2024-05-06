import {type ClassValue, clsx} from "clsx"
import formatDistanceToNow from "date-fns/formatDistanceToNow";
import {twMerge} from "tailwind-merge"
import format from "date-fns/format";
// @ts-ignore
import {stripHtml} from "string-strip-html";
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
    return format(date, "yyyy-MM-dd HH:mm:ss")
  }

  return formatDistanceToNow(date, {addSuffix: true})
}

export function stripHtml(html: string) {
  if (!html?.length) return html;
  return stripHtml(html)?.result;
}

const defaultOptions = {
  allowedTags: ['b', 'i', 'em', 'strong', 'a'],
  allowedAttributes: {
    'a': ['href']
  },
};

export const sanitize = (dirty: string, options?: IOptions) => {
  return ({
    __html: sanitizeHtml(dirty, {...defaultOptions, ...options}),
  });
}
