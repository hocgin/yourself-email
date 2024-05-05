import {type ClassValue, clsx} from "clsx"
import {twMerge} from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function join(arr: string[] = [], separator: string = ',') {
  return arr.join(separator)
}

export function unique<T>(arr: T[] = []): T[] {
  return [...new Set<T>(arr)];
}
