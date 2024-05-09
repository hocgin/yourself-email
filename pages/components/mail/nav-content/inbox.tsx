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
import {Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle} from "@/components/ui/sheet";
import {EventEmitter} from "ahooks/lib/useEventEmitter";
import {Message} from "@/types/base";
import {RouteKey} from "@/components/mail/mail";

type Created = {
  defaultLayout: number[];
  selectedOwner: IMail;
  selectedMail: Mail;
  tabKey: string;
  keyword: string;
  setTabKey: (tabKey: string) => void;
  mails: Mail[];
  setKeyword: (keyword: string) => void;
  setSelectedMail: (mail: Mail) => void;
  $event: EventEmitter<Message>;
  contentRef: React.MutableRefObject<Element>;
  path: RouteKey | any;
  isMobile?: boolean;
};

export enum TabKey {
  all = 'all',
  unread = 'unread',
}

export const InboxContent: React.FC<Created> = ({
                                                  isMobile,
                                                  defaultLayout,
                                                  selectedMail,
                                                  mails,
                                                  keyword,
                                                  setKeyword,
                                                  setSelectedMail,
                                                  selectedOwner, $event,
                                                  tabKey, setTabKey, contentRef, path
                                                }) => {
  let [open, setOpen] = useState(false);
  return <>
    <ResizablePanel className={'flex flex-col'} defaultSize={isMobile ? 100 - defaultLayout[0] : defaultLayout[1]}
                    minSize={30}>
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
              <Input placeholder="Search" className="pl-8" value={keyword}
                     onChange={e => setKeyword(e.target.value)} />
            </div>
          </form>
        </div>
        {mails?.length ? <>
          <MailList path={path} contentRef={contentRef} items={mails} selected={selectedMail?.id}
                    onClick={(mail) => {
                      setSelectedMail(mail);
                      setOpen(true)
                    }} />
        </> : <div className={'py-5 px-10 h-full'}>
          <Empty />
        </div>}
      </Tabs>
    </ResizablePanel>
    {isMobile ? <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className={'p-0'} unclose>
          <MailDisplay $event={$event} mail={selectedMail} selectedOwner={selectedOwner} />
        </SheetContent>
      </Sheet>
    </> : <>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={defaultLayout[2]}>
        <MailDisplay $event={$event} mail={selectedMail} selectedOwner={selectedOwner} />
      </ResizablePanel>
    </>}
  </>;
};
