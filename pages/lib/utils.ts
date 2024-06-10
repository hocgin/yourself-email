import {type ClassValue, clsx} from "clsx"
import formatDistanceToNow from "date-fns/formatDistanceToNow";
import {twMerge} from "tailwind-merge"
import format from "date-fns/format";


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function isSameDay(date1: Date, date2: Date) {
  // 获取两个日期的年月日
  const date1Year = date1.getUTCFullYear();
  const date1Month = date1.getUTCMonth();
  const date1Day = date1.getUTCDate();

  const date2Year = date2.getUTCFullYear();
  const date2Month = date2.getUTCMonth();
  const date2Day = date2.getUTCDate();

  // 比较年月日
  return date1Year === date2Year &&
    date1Month === date2Month &&
    date1Day === date2Day;
}

export function formatDistanceDay(date: Date): string {
  let now = new Date();
  if (isSameDay(date, now)) {
    return format(date, "HH:mm:ss");
  }

  const timeDiff = Math.abs(date.getTime() - now.getTime());
  const daysApart = Math.ceil(timeDiff / (1000 * 3600 * 24));
  if (daysApart > 7) {
    return format(date, "yyyy-MM-dd");
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

export const getEmailName = (address?: string) => {
  if (!address) return address;
  if (!address.includes('@')) return address;
  return address.split('@')[0];
};

export const getEmailDomain = (address?: string) => {
  if (!address) return address;
  if (!address.includes('@')) return address;
  return address.split('@')[1];
};
