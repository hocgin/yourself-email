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
  let $event = useEventEmitter<Message>();
  $event.useSubscription(async (message: Message) => {
    if (message.type === MessageType.UpdateMail) {
      setSelectedMail(message?.value);
    }
  });
  let [routeKey, setRouteKey] = useQueryState('path', {defaultValue: RouteKey.Inbox});
  const [isCollapsed, setIsCollapsed] = useLocalStorageState<boolean>('isCollapsed', {defaultValue: defaultCollapsed})
  const {selected, setSelected, selectedMail, setSelectedMail, setKeyword, accounts, allMails, unreadMails} = useMail();
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
                 variant: routeKey === RouteKey.New ? "default" : 'ghost',
                 onClick: () => setRouteKey(RouteKey.New)
               }, {
                 title: "Inbox",
                 label: "128",
                 icon: Inbox,
                 variant: routeKey === RouteKey.Inbox ? "default" : 'ghost',
                 onClick: () => setRouteKey(RouteKey.Inbox)
               }, {
                 title: "Archive",
                 label: "128",
                 icon: Archive,
                 variant: routeKey === RouteKey.Archive ? "default" : 'ghost',
                 onClick: () => setRouteKey(RouteKey.Archive)
               }, {
                 title: "Trash",
                 label: "",
                 icon: Trash2,
                 variant: routeKey === RouteKey.Trash ? "default" : 'ghost',
                 onClick: () => setRouteKey(RouteKey.Trash)
               }, {
                 title: "Permissions",
                 label: "",
                 icon: Users2,
                 variant: routeKey === RouteKey.Permissions ? "default" : 'ghost',
                 onClick: () => setRouteKey(RouteKey.Permissions)
               }]} />
        </ResizablePanel>
        <ResizableHandle withHandle />
        {routeKey === RouteKey.Inbox ?
          <InboxContent allMails={allMails} selectedOwner={selected} selectedMail={selectedMail} $event={$event}
                        setSelectedMail={setSelectedMail} unreadMails={unreadMails}
                        defaultLayout={defaultLayout}
                        setKeyword={setKeyword} /> : undefined}
        {routeKey === RouteKey.Archive ?
          <InboxContent allMails={allMails} selectedOwner={selected} selectedMail={selectedMail} $event={$event}
                        setSelectedMail={setSelectedMail} unreadMails={unreadMails}
                        defaultLayout={defaultLayout}
                        setKeyword={setKeyword} /> : undefined}
        {routeKey === RouteKey.New ? <SentContent selectedOwner={selected} defaultLayout={defaultLayout} /> : undefined}
        {routeKey === RouteKey.Trash ?
          <InboxContent allMails={allMails} selectedOwner={selected} selectedMail={selectedMail} $event={$event}
                        setSelectedMail={setSelectedMail} unreadMails={unreadMails}
                        defaultLayout={defaultLayout}
                        setKeyword={setKeyword} /> : undefined}
        {routeKey === RouteKey.Permissions ? <PermissionsContent defaultLayout={defaultLayout} /> : undefined}
      </ResizablePanelGroup>
    </TooltipProvider>
  );
}
