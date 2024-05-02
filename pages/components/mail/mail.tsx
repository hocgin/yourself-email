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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {TooltipProvider} from "@/components/ui/tooltip"
import {AccountSwitcher} from "./account-switcher"
import {Nav} from "./nav"
import {useMail} from "./use-mail"
import {useState} from "react";
import {Button} from "@/components/ui/button";
import {InboxContent} from "@/components/mail/nav-content";

interface MailProps {
  defaultLayout?: number[] | undefined
  defaultCollapsed?: boolean
  navCollapsedSize: number
}

export function Mail({defaultLayout = [265, 440, 655], defaultCollapsed = false, navCollapsedSize}: MailProps) {
  let [route, setRoute] = useState<string>('inbox');
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
            <Button className={'w-full'} size="sm" variant="ghost">
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
                 variant: "default",
               }, {
                 title: "Trash",
                 label: "",
                 icon: Trash2,
                 variant: "ghost",
               }]} />
        </ResizablePanel>
        <ResizableHandle withHandle />


        <InboxContent allMails={allMails} selected={selected} selectedMail={selectedMail}
                      setSelectedMail={setSelectedMail} unreadMails={unreadMails} defaultLayout={defaultLayout}
                      setKeyword={setKeyword} />
      </ResizablePanelGroup>
    </TooltipProvider>
  );
}
