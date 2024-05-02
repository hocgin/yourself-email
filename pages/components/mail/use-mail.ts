"use client";

import {useInfiniteScroll, useRequest, useSet} from "ahooks";
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
  // 本地已读 ID 列表
  let [localReadyList, {add: addLocalReady}] = useSet<string>([]);
  // 查看邮件详情
  let [selectedMail, setSelectedMail] = useState<Mail>();
  // 当前选中的账号
  let [selected, setSelected] = useState<IMail>();
  // 账号列表
  let accounts = useRequest(AppService.listAccounts, {
    onSuccess: (data) => {
      if (selected) return;
      let selectedAct = data?.length ? data?.[0] : null;
      console.log('selectedMail', selectedAct);
      setSelected(selectedAct);
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
    selectedMail,
    setSelectedMail: (mail: Mail) => {
      setSelectedMail(mail);
      getMail.run(mail.id);
      addLocalReady(mail.id);
    },
    accounts: accounts.data ?? [],
    unreadMails: relist(localReadyList, unreadMail.data?.list ?? []),
    allMails: relist(localReadyList, allMail.data?.list ?? []),
  } as const;
}

function relist(localReadyList: Set<string>, oldList: Mail[]) {
  return oldList.map(e => ({...e, isRead: e?.isRead || localReadyList.has(e?.id)}));
}
