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

type Created = {
  defaultLayout: number[];
  selected: IMail;
  selectedMail: Mail;
  allMails: Mail[];
  unreadMails: Mail[];
  setKeyword: (keyword: string) => void;
  setSelectedMail: (mail: Mail) => void;
};
export const InboxContent: React.FC<Created> = ({
                                                  defaultLayout,
                                                  selectedMail,
                                                  allMails,
                                                  unreadMails,
                                                  setKeyword,
                                                  setSelectedMail,
                                                  selected
                                                }) => {
  const [tabKey, setTabKey] = useState('all');
  return <>
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
  </>;
};
