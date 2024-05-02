"use client";

import {useInfiniteScroll, useRequest} from "ahooks";
import {AppService} from "@/service/http/app";
import React, {useState} from "react";
import {BasicTarget} from "@/components/useInfiniteTopScroll/types";
import {IMail, Mail} from "@/types/http";
import {useToast} from "@/components/ui/use-toast"


interface Option {
  unreadTarget: BasicTarget<Element | Document>;
  allTarget: BasicTarget<Element | Document>;
}


export function useMail(option?: Option) {
  const {toast} = useToast();
  // 查看邮件详情
  let [selectedMail, setSelectedMail] = useState<Mail>();
  // 当前选中的账号
  let [selected, setSelected] = useState<IMail>();
  // 账号列表
  let accounts = useRequest(AppService.listAccounts, {
    onSuccess: (data) => {
      if (selected) return;
      let selectedMail = data?.length ? data?.[0] : null;
      console.log('selectedMail', selectedMail);
      setSelected(selectedMail);
    },
    onError: (e) => toast({variant: "destructive", title: e?.name, description: e?.message}),
  });

  let [keyword, setKeyword] = useState<string>();

  // 未读列表
  const unreadMail = useInfiniteScroll((d) =>
    AppService.scrollByMail({
      nextId: d?.nextId ?? 1,
      size: 10 * 6,
      keyword,
      owner: selected?.address,
      onlyUnread: true
    }), {
    isNoMore: d => !d?.hasMore,
    reloadDeps: [keyword, selected],
    threshold: 300,
    target: option?.unreadTarget
  });
  // 所有
  const allMail = useInfiniteScroll((d) =>
    AppService.scrollByMail({nextId: d?.nextId ?? 1, size: 10 * 6, keyword, owner: selected?.address}), {
    isNoMore: d => !d?.hasMore,
    reloadDeps: [keyword, selected],
    threshold: 300,
    target: option?.allTarget
  });

  return {
    selected, setSelected,
    setKeyword,
    selectedMail, setSelectedMail,
    accounts: accounts.data ?? [],
    unreadMails: unreadMail.data?.list ?? [],
    allMails: allMail.data?.list ?? []
  } as const;
}
