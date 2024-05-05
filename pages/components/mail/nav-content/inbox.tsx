import React, {useState} from "react";
import {ResizableHandle, ResizablePanel} from "@/components/ui/resizable";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Separator} from "@/components/ui/separator";
import {Search} from "lucide-react";
import {Input} from "@/components/ui/input";
import {MailList} from "@/components/mail/mail-list";
import Empty from "../../empty";
import {MailDisplay} from "@/components/mail/mail-display";
import {IMail, Mail} from "@/types/http";
import {useQueryState} from "nuqs";
import {EventEmitter} from "ahooks/lib/useEventEmitter";
import {Message} from "@/types/base";

type Created = {
  defaultLayout: number[];
  selectedOwner: IMail;
  selectedMail: Mail;
  tabKey: string;
  setTabKey: (tabKey: string) => void;
  mails: Mail[];
  setKeyword: (keyword: string) => void;
  setSelectedMail: (mail: Mail) => void;
  $event: EventEmitter<Message>;
};

export enum TabKey {
  all = 'all',
  unread = 'unread',
}

export const InboxContent: React.FC<Created> = ({
                                                  defaultLayout,
                                                  selectedMail,
                                                  mails,
                                                  setKeyword,
                                                  setSelectedMail,
                                                  selectedOwner, $event,
                                                  tabKey, setTabKey
                                                }) => {
  return <>
    <ResizablePanel className={'flex flex-col'} defaultSize={defaultLayout[1]} minSize={30}>
      <Tabs className='flex flex-col overflow-hidden' value={tabKey} onValueChange={setTabKey}>
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
        <div className="bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <form>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search" className="pl-8"
                     onChange={e => setKeyword(e.target.value)} />
            </div>
          </form>
        </div>
        {mails?.length ? <>
          <TabsContent value={TabKey.all} className="m-0 flex-1 overflow-hidden">
            <MailList items={mails} selected={selectedMail?.id} onClick={setSelectedMail} />
          </TabsContent>
          <TabsContent value={TabKey.unread} className="m-0 flex-1 overflow-hidden">
            <MailList items={mails} selected={selectedMail?.id} onClick={setSelectedMail} />
          </TabsContent>
        </> : <div className={'py-5 px-10 h-full'}>
          <Empty />
        </div>}
      </Tabs>
    </ResizablePanel>
    <ResizableHandle withHandle />
    <ResizablePanel defaultSize={defaultLayout[2]}>
      <MailDisplay $event={$event} mail={selectedMail} selectedOwner={selectedOwner} />
    </ResizablePanel>
  </>;
};
