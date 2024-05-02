"use client"

import * as React from "react"
import {
  AlertCircle,
  Archive,
  ArchiveX,
  File,
  Inbox,
  MessagesSquare,
  Search,
  Send,
  ShoppingCart,
  Trash2,
  Users2,
} from "lucide-react"
import {EnvelopeOpenIcon} from "@radix-ui/react-icons";

import {cn} from "@/lib/utils"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import {Separator} from "@/components/ui/separator"
import {TooltipProvider} from "@/components/ui/tooltip"
import {AccountSwitcher} from "./account-switcher"
import {Nav} from "./nav"
import {useMail} from "./use-mail"
import {useState} from "react";
import {Button} from "@/components/ui/button";
import {InboxContent} from "@/components/mail/nav-content";
import {useLocalStorageState} from 'ahooks';
import {NewMail} from "@/components/mail/nav-content/new-mail";
import {useQueryState} from 'nuqs';

interface MailProps {
  defaultLayout?: number[] | undefined
  defaultCollapsed?: boolean
  navCollapsedSize: number
}

enum RouteKey {
  Inbox = 'inbox',
  New = 'new',
  Trash = 'trash',
}

export function Mail({defaultLayout = [16, 24, 60], defaultCollapsed = false, navCollapsedSize}: MailProps) {
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
          <div className='justify-center px-2 py-2 flex'>
            <Button className={'w-full'} size="sm" variant="ghost" onClick={() => setRouteKey(RouteKey.New)}>
              <EnvelopeOpenIcon className="mr-2 h-4 w-4" />
              写邮件
            </Button>
          </div>
          <Separator />
          <Nav isCollapsed={isCollapsed}
               links={[{
                 title: "Inbox",
                 label: "128",
                 icon: Inbox,
                 variant: routeKey === RouteKey.Inbox ? "default" : 'ghost',
                 onClick: () => setRouteKey(RouteKey.Inbox)
               }, {
                 title: "Trash",
                 label: "",
                 icon: Trash2,
                 variant: routeKey === RouteKey.Trash ? "default" : 'ghost',
                 onClick: () => setRouteKey(RouteKey.Trash)
               }]} />
        </ResizablePanel>
        <ResizableHandle withHandle />
        {routeKey === RouteKey.Inbox ? <InboxContent allMails={allMails} selected={selected} selectedMail={selectedMail}
                                                     setSelectedMail={setSelectedMail} unreadMails={unreadMails}
                                                     defaultLayout={defaultLayout}
                                                     setKeyword={setKeyword} /> : undefined}
        {routeKey === RouteKey.New ? <NewMail defaultLayout={defaultLayout} /> : undefined}
        {routeKey === RouteKey.Trash ? <InboxContent allMails={allMails} selected={selected} selectedMail={selectedMail}
                                                     setSelectedMail={setSelectedMail} unreadMails={unreadMails}
                                                     defaultLayout={defaultLayout}
                                                     setKeyword={setKeyword} /> : undefined}
      </ResizablePanelGroup>
    </TooltipProvider>
  );
}
