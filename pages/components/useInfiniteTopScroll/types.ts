import {DependencyList, MutableRefObject} from "react";

declare type TargetType = HTMLElement | Element | Window | Document;
declare type TargetValue<T> = T | undefined | null;
export  type BasicTarget<T extends TargetType = Element> =
  (() => TargetValue<T>)
  | TargetValue<T>
  | MutableRefObject<TargetValue<T>>;

export declare type Data = {
  list: any[];
  [key: string]: any;
};
export declare type Service<TData extends Data> = (currentData?: Data) => Promise<TData>;

export interface InfiniteScrollOptions<TData extends Data> {
  target?: BasicTarget<Element | Document>;
  isNoMore?: (data?: TData) => boolean;
  threshold?: number;
  manual?: boolean;
  reloadDeps?: DependencyList;
  onBefore?: () => void;
  onSuccess?: (data: TData) => void;
  onError?: (e: Error) => void;
  onFinally?: (data?: TData, e?: Error) => void;
}
