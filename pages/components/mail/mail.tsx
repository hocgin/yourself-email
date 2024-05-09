"use client"

import * as React from "react"
import {Inbox, Send, Plus, Trash2, Users2, Archive} from "lucide-react"

import {cn} from "@/lib/utils"
import {ResizableHandle, ResizablePanel, ResizablePanelGroup,} from "@/components/ui/resizable"
import {Separator} from "@/components/ui/separator"
import {TooltipProvider} from "@/components/ui/tooltip"
import {AccountSwitcher} from "./account-switcher"
import {Nav} from "./nav"
import {useMail} from "./use-mail"
import {InboxContent, PermissionsContent, SentContent} from "@/components/mail/nav-content";
import {useEventEmitter, useLocalStorageState} from 'ahooks';
import {useQueryState} from 'nuqs';
import {Message, MessageType} from "@/types/base";
import {TabKey} from "@/components/mail/nav-content/inbox";
import {useEffect, useRef} from "react";
import {useDevice} from "@/components/useDevice";
import {useState} from 'react'

interface MailProps {
  defaultLayoutPc?: number[] | undefined
  defaultLayoutMc?: number[] | undefined
  layoutMcKey?: string;
  layoutPcKey?: string;
  navCollapsedSize: number
}

export enum RouteKey {
  Inbox = 'inbox',
  Archive = 'archive',
  New = 'new',
  Sent = 'sent',
  Trash = 'trash',
  Permissions = 'permissions',
}

export function Mail({
                       navCollapsedSize,
                       layoutMcKey,
                       layoutPcKey,
                       defaultLayoutMc,
                       defaultLayoutPc
                     }: MailProps) {
  let {isMobile = true} = useDevice();
  let layoutKey = isMobile ? layoutMcKey : layoutPcKey;
  let defaultLayout = (isMobile ? defaultLayoutMc : defaultLayoutPc) ?? [16, 24, 60];

  const inboxRef = useRef();
  let [path, setPath] = useQueryState('path', {defaultValue: RouteKey.Inbox});
  let [tabKey, setTabKey] = useQueryState('tab', {defaultValue: TabKey.all});
  const [isCollapsed, setIsCollapsed] = useLocalStorageState<boolean>('isCollapsed', {defaultValue: isMobile});
  let $event = useEventEmitter<Message>();
  $event.useSubscription(async (message: Message) => {
    if (message.type === MessageType.UpdateMail) {
      setSelectedMail(message?.value);
    }
  });
  const {
    filter, setFilter,
    selected, setSelected,
    selectedMail, setSelectedMail,
    keyword, setKeyword,
    accounts,
    mails,
    inboxUnreadCount
  } = useMail({inboxRef});
  useEffect(() => setIsCollapsed(isMobile), [isMobile]);
  useEffect(() => {
    setFilter({
      ...filter,
      onlyUnread: tabKey === TabKey.unread ? true : undefined,
      isArchive: path === RouteKey.Archive ? true : undefined,
      isTrash: path === RouteKey.Trash,
      isReceive: path !== RouteKey.Sent,
    })
  }, [path, tabKey]);
  return (
    <TooltipProvider delayDuration={0}>
      <ResizablePanelGroup direction="horizontal"
                           onLayout={(sizes: number[]) => document.cookie = `${layoutKey}=${JSON.stringify(sizes)}`}
                           className="h-full max-h-screen items-stretch">
        <ResizablePanel
          defaultSize={isMobile ? 10 : defaultLayout[0]}
          collapsedSize={navCollapsedSize}
          collapsible
          minSize={12}
          maxSize={20}
          // 展开
          onExpand={() => setIsCollapsed(false)}
          // 折叠
          onCollapse={() => setIsCollapsed(true)}
          className={cn(isCollapsed && "min-w-[50px] transition-all duration-300 ease-in-out")}>
          <div className={cn("flex h-[52px] items-center justify-center",
            isCollapsed ? "h-[52px]" : "px-2"
          )}>
            <AccountSwitcher isCollapsed={isCollapsed} defaultValue={selected} onSelectedAccount={setSelected}
                             accounts={accounts} />
          </div>
          <Separator />
          <Nav isCollapsed={isCollapsed}
               links={[{
                 title: "Compose",
                 label: "",
                 icon: Plus,
                 variant: path === RouteKey.New ? "default" : 'ghost',
                 onClick: () => setPath(RouteKey.New)
               }, {
                 title: "Sent",
                 label: "",
                 icon: Send,
                 variant: path === RouteKey.Sent ? "default" : 'ghost',
                 onClick: () => setPath(RouteKey.Sent)
               }, {
                 title: "Inbox",
                 label: inboxUnreadCount,
                 icon: Inbox,
                 variant: path === RouteKey.Inbox ? "default" : 'ghost',
                 onClick: () => setPath(RouteKey.Inbox)
               }, {
                 title: "Archive",
                 label: "",
                 icon: Archive,
                 variant: path === RouteKey.Archive ? "default" : 'ghost',
                 onClick: () => setPath(RouteKey.Archive)
               }, {
                 title: "Trash",
                 label: "",
                 icon: Trash2,
                 variant: path === RouteKey.Trash ? "default" : 'ghost',
                 onClick: () => setPath(RouteKey.Trash)
               }, {
                 title: "Permissions",
                 label: "",
                 icon: Users2,
                 variant: path === RouteKey.Permissions ? "default" : 'ghost',
                 onClick: () => setPath(RouteKey.Permissions)
               }]} />
        </ResizablePanel>
        <ResizableHandle withHandle />
        {[RouteKey.Inbox, RouteKey.Archive, RouteKey.Trash, RouteKey.Sent].includes(path as any) ?
          <InboxContent mails={mails} selectedOwner={selected} selectedMail={selectedMail} $event={$event}
                        isMobile={isMobile} path={path}
                        contentRef={inboxRef}
                        setSelectedMail={setSelectedMail} tabKey={tabKey} setTabKey={setTabKey}
                        defaultLayout={defaultLayout}
                        keyword={keyword} setKeyword={setKeyword} /> : undefined}
        {path === RouteKey.New ?
          <SentContent isMobile={isMobile} selectedOwner={selected} defaultLayout={defaultLayout} /> : undefined}
        {path === RouteKey.Permissions ?
          <PermissionsContent isMobile={isMobile} defaultLayout={defaultLayout} /> : undefined}
      </ResizablePanelGroup>
    </TooltipProvider>
  );
}
