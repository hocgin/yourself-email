"use client"

import * as React from "react"
import {Inbox, Send, Trash2, Users2, Archive} from "lucide-react"

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

interface MailProps {
  defaultLayout?: number[] | undefined
  defaultCollapsed?: boolean
  navCollapsedSize: number
}

enum RouteKey {
  Inbox = 'inbox',
  Archive = 'archive',
  New = 'new',
  Trash = 'trash',
  Permissions = 'permissions',
}

export function Mail({defaultLayout = [16, 24, 60], defaultCollapsed = false, navCollapsedSize}: MailProps) {
  const inboxRef = useRef();
  let $event = useEventEmitter<Message>();
  $event.useSubscription(async (message: Message) => {
    if (message.type === MessageType.UpdateMail) {
      setSelectedMail(message?.value);
    }
  });
  let [path, setPath] = useQueryState('path', {defaultValue: RouteKey.Inbox});
  let [tabKey, setTabKey] = useQueryState('tab', {defaultValue: TabKey.all});
  const [isCollapsed, setIsCollapsed] = useLocalStorageState<boolean>('isCollapsed', {defaultValue: defaultCollapsed})
  const {
    filter,
    setFilter,
    selected,
    setSelected,
    selectedMail,
    setSelectedMail,
    setKeyword,
    accounts,
    mails,
    inboxUnreadCount
  } = useMail({inboxRef});
  useEffect(() => {
    setFilter({
      ...filter,
      onlyUnread: tabKey === TabKey.unread ? true : undefined,
      isArchive: path === RouteKey.Archive ? true : undefined,
      isTrash: path === RouteKey.Trash,
    })
  }, [path, tabKey]);

  return (
    <TooltipProvider delayDuration={0}>
      <ResizablePanelGroup direction="horizontal"
                           onLayout={(sizes: number[]) => document.cookie = `react-resizable-panels:layout=${JSON.stringify(sizes)}`}
                           className="h-full max-h-screen items-stretch">
        <ResizablePanel
          defaultSize={defaultLayout[0]}
          collapsedSize={navCollapsedSize}
          collapsible={true}
          minSize={15}
          maxSize={20}
          onExpand={() => {
            const collapsed = false;
            setIsCollapsed(collapsed);
            document.cookie = `react-resizable-panels:collapsed=${JSON.stringify(collapsed)}`;
          }}
          onCollapse={() => {
            const collapsed = true;
            setIsCollapsed(collapsed);
            document.cookie = `react-resizable-panels:collapsed=${JSON.stringify(collapsed)}`;
          }}
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
                 title: "Sent",
                 label: "",
                 icon: Send,
                 variant: path === RouteKey.New ? "default" : 'ghost',
                 onClick: () => setPath(RouteKey.New)
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
        {[RouteKey.Inbox, RouteKey.Archive, RouteKey.Trash].includes(path as any) ?
          <InboxContent mails={mails} selectedOwner={selected} selectedMail={selectedMail} $event={$event}
                        contentRef={inboxRef}
                        setSelectedMail={setSelectedMail} tabKey={tabKey} setTabKey={setTabKey}
                        defaultLayout={defaultLayout}
                        setKeyword={setKeyword} /> : undefined}
        {path === RouteKey.New ? <SentContent selectedOwner={selected} defaultLayout={defaultLayout} /> : undefined}
        {path === RouteKey.Permissions ? <PermissionsContent defaultLayout={defaultLayout} /> : undefined}
      </ResizablePanelGroup>
    </TooltipProvider>
  );
}
