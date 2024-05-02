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

import {cn} from "@/lib/utils"
import {Input} from "@/components/ui/input"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import {Separator} from "@/components/ui/separator"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {TooltipProvider} from "@/components/ui/tooltip"
import {AccountSwitcher} from "./account-switcher"
import {MailDisplay} from "./mail-display"
import {MailList} from "./mail-list"
import {Nav} from "./nav"
import {useMail} from "./use-mail"
import {useState} from "react";
import Empty from "@/components/empty";

interface MailProps {
  defaultLayout?: number[] | undefined
  defaultCollapsed?: boolean
  navCollapsedSize: number
}

export function Mail({defaultLayout = [265, 440, 655], defaultCollapsed = false, navCollapsedSize}: MailProps) {
  const [tabKey, setTabKey] = useState('all');
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);
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
          // @ts-ignore
          onCollapse={(collapsed) => {
            setIsCollapsed(collapsed)
            document.cookie = `react-resizable-panels:collapsed=${JSON.stringify(
              collapsed
            )}`
          }}
          className={cn(
            isCollapsed &&
            "min-w-[50px] transition-all duration-300 ease-in-out"
          )}
        >
          <div className={cn("flex h-[52px] items-center justify-center",
            isCollapsed ? "h-[52px]" : "px-2"
          )}>
            <AccountSwitcher isCollapsed={isCollapsed} defaultValue={selected} onSelectedAccount={setSelected}
                             accounts={accounts} />
          </div>
          <Separator />
          <Nav isCollapsed={isCollapsed}
               links={[{
                 title: "Inbox",
                 label: "128",
                 icon: Inbox,
                 variant: "default",
               }]} />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={defaultLayout[1]} minSize={30}>
          <Tabs value={tabKey} onValueChange={setTabKey}>
            <div className="flex items-center px-4 py-2">
              <h1 className="text-xl font-bold">Inbox</h1>
              <TabsList className="ml-auto">
                <TabsTrigger
                  value="all"
                  className="text-zinc-600 dark:text-zinc-200">
                  All
                </TabsTrigger>
                <TabsTrigger
                  value="unread"
                  className="text-zinc-600 dark:text-zinc-200">
                  Unread
                </TabsTrigger>
              </TabsList>
            </div>
            <Separator />
            {(tabKey === 'all' ? allMails : unreadMails)?.length ? <>
              <div className="bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <form>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search" className="pl-8"
                           onChange={e => setKeyword(e.target.value)} />
                  </div>
                </form>
              </div>
              <TabsContent value="all" className="m-0">
                <MailList items={allMails} selected={selectedMail?.id} onClick={setSelectedMail} />
              </TabsContent>
              <TabsContent value="unread" className="m-0">
                <MailList items={unreadMails} selected={selectedMail?.id} onClick={setSelectedMail} />
              </TabsContent>
            </> : <div className={'py-5 px-10 h-full'}>
              <Empty />
            </div>}
          </Tabs>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={defaultLayout[2]}>
          <MailDisplay mail={selectedMail} selectedOwner={selected} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </TooltipProvider>
  )
}
