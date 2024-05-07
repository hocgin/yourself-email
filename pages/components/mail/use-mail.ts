"use client";

import {useInfiniteScroll, useRequest, useSet} from "ahooks";
import {AppService} from "@/service/http/app";
import React, {useState} from "react";
import {BasicTarget} from "@/components/useInfiniteTopScroll/types";
import {IMail, Mail} from "@/types/http";
import {useToast} from "@/components/ui/use-toast"


interface Option {
  inboxRef: BasicTarget<Element | Document>;
}


type FilterType = {
  onlyUnread?: boolean;
  isTrash?: boolean;
  isArchive?: boolean;
  isReceive?: boolean;
};

export function useMail(option?: Option) {
  let [filter, setFilter] = useState<FilterType>();
  const {toast} = useToast();
  // 本地已读 ID 列表
  let [localReadyList, {add: addLocalReady}] = useSet<string>([]);
  // 查看邮件详情
  let [selectedMail, setSelectedMail] = useState<Mail>();
  // 当前选中的账号
  let [selected, setSelected] = useState<IMail>();
  // 账号列表
  let state = useRequest(AppService.state, {
    onSuccess: (data) => {
      if (selected) return;
      let accounts = data?.accounts;
      setSelected(accounts?.length ? accounts?.[0] : null);
    },
    onError: (e) => toast({variant: "destructive", title: e?.name, description: e?.message}),
  });

  // 查询邮件详情
  let getMail = useRequest(AppService.getMail, {
    manual: true,
    onSuccess: (data) => setSelectedMail(data),
    onError: (e) => toast({variant: "destructive", title: e?.name, description: e?.message}),
  });

  let [keyword, setKeyword] = useState<string>();

  // 邮件列表
  const mails = useInfiniteScroll((d) =>
    AppService.scrollByMail({
      nextId: d?.nextId ?? 1,
      size: 10,
      keyword,
      owner: selected?.address,
      ...filter,
    }), {
    isNoMore: d => !d?.hasMore,
    reloadDeps: [keyword, selected, filter],
    threshold: 300,
    target: option?.inboxRef
  });

  return {
    selected, setSelected,
    keyword, setKeyword,
    filter, setFilter,
    selectedMail,
    setSelectedMail: (mail: Mail) => {
      setSelectedMail(mail);
      if (mail.id !== selectedMail?.id) {
        getMail.run(mail.id);
        addLocalReady(mail.id);
      }
    },
    accounts: state.data?.accounts ?? [],
    inboxUnreadCount: state.data?.inboxUnreadCount > 0 ? state.data?.inboxUnreadCount : '',
    mails: relist(localReadyList, mails.data?.list ?? []),
  } as const;
}

function relist(localReadyList: Set<string>, oldList: Mail[]) {
  return oldList.map(e => ({...e, isRead: e?.isRead || localReadyList.has(e?.id)}));
}
