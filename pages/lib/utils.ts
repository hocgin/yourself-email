import {type ClassValue, clsx} from "clsx"
import formatDistanceToNow from "date-fns/formatDistanceToNow";
import {twMerge} from "tailwind-merge"
import format from "date-fns/format";


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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


export function join(arr: string[] = [], separator: string = ',') {
  return arr.join(separator)
}

export function unique<T>(arr: T[] = []): T[] {
  return [...new Set<T>(arr)];
}

export const removeArray = (a: string[] = [], b: string[] = []) => {
  if (!b?.length) return a;
  return a.filter(item => !b.includes(item));
}
