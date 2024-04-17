import {useEffect, useMemo, useState} from 'react';
import {useEventListener, useMemoizedFn, useRequest, useUpdateEffect} from 'ahooks';
import {
  setScrollTop,
  getTargetElement,
  getClientHeight,
  getScrollHeight, getScrollTop,
} from './rect';
import type {
  Data,
  InfiniteScrollOptions,
  Service,
} from './types';


export const useInfiniteTopScroll = <TData extends Data>(
  service: Service<TData>,
  options: InfiniteScrollOptions<TData> = {},
) => {
  const {
    target,
    isNoMore,
    threshold = 100,
    reloadDeps = [],
    manual,
    onBefore,
    onSuccess,
    onError,
    onFinally,
  } = options;

  const [finalData, setFinalData] = useState<TData>();
  const [loadingMore, setLoadingMore] = useState(false);

  const noMore = useMemo(() => {
    if (!isNoMore) return false;
    return isNoMore(finalData);
  }, [finalData]);

  const {loading, run, runAsync, cancel} = useRequest(
    async (lastData?: TData) => {
      const currentData = await service(lastData);
      let finalData = {
        ...currentData,
        // @ts-ignore
        list: [
          ...(currentData?.list || []).reverse(),
          ...(lastData?.list || []),
        ],
      };
      if (!lastData) {
        setFinalData(finalData);
      } else {
        setFinalData(finalData);
      }
      restoreScroll();
      return currentData;
    },
    {
      manual,
      onFinally: (_, d, e) => {
        setLoadingMore(false);
        onFinally?.(d, e);
      },
      onBefore: () => onBefore?.(),
      onSuccess: (d) => {
        setTimeout(() => {
          // eslint-disable-next-line @typescript-eslint/no-use-before-define
          scrollMethod();
        });
        onSuccess?.(d);
      },
      onError: (e) => onError?.(e),
    },
  );

  const loadMore = () => {
    if (noMore) return;
    storeScroll();
    setLoadingMore(true);
    run(finalData);
  };

  const loadMoreAsync = () => {
    if (noMore) return undefined;
    setLoadingMore(true);
    return runAsync(finalData);
  };

  const reload = () => run();
  const reloadAsync = () => runAsync();

  const scrollMethod = () => {
    const el = getTargetElement(target);
    if (!el) {
      return;
    }

    const scrollTop = getScrollTop(el);

    if (scrollTop <= threshold) {
      loadMore();
    }
  };

  const storeScroll = () => {
    const el = getTargetElement(target);
    if (!el) {
      return;
    }
    const scrollTop = getScrollTop(el);
    const scrollHeight = getScrollHeight(el);
    // @ts-ignore
    el.dataset.scrollTop = scrollTop;
    // @ts-ignore
    el.dataset.scrollHeight = scrollHeight;
  };

  const restoreScroll = () => {
    const el = getTargetElement(target);
    if (!el) {
      return;
    }
    const newScrollHeight = getScrollHeight(el);

    // @ts-ignore
    const scrollTop = parseInt(el?.dataset?.scrollTop) || newScrollHeight;
    // @ts-ignore
    const scrollHeight = parseInt(el?.dataset?.scrollHeight) || newScrollHeight;

    console.log(
      '(newScrollHeight - scrollHeight) + scrollTop',
      newScrollHeight,
      scrollTop,
      scrollHeight,
    );

    let newScrollTop = newScrollHeight - scrollHeight + scrollTop || 101;

    setScrollTop(el, newScrollTop);
  };

  useEventListener(
    'scroll',
    () => {
      if (loading || loadingMore) {
        return;
      }
      scrollMethod();
    },
    {target},
  );

  useUpdateEffect(() => {
    run();
  }, [...reloadDeps]);

  useEffect(() => {
    restoreScroll();
    return storeScroll;
  });

  return {
    data: finalData,
    loading: !loadingMore && loading,
    loadingMore,
    noMore,

    loadMore: useMemoizedFn(loadMore),
    loadMoreAsync: useMemoizedFn(loadMoreAsync),
    reload: useMemoizedFn(reload),
    reloadAsync: useMemoizedFn(reloadAsync),
    mutate: setFinalData,
    cancel,
  };
};

