import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {TooltipTrigger} from "@/components/ui/tooltip";
import {Button} from "@/components/ui/button";
import {Clock, Search} from "lucide-react";
import React, {useEffect, useRef, useState} from "react";
import {MailCard} from "./MailCard";
import {useInfiniteScroll} from "ahooks";
import {AppService} from "@/service/http/app";
import {ScrollArea} from "@/components/ui/scroll-area";
import {Input} from "@/components/ui/input";
import Empty from "../../empty";
import {EventEmitter} from "ahooks/lib/useEventEmitter";
import {Message, MessageType} from "@/types/base";
import {Mail} from "@/types/http";

type Created = {
  disabled: boolean;
  owner: string;
  fromAddress: string;
  selectedMail: Mail;
  $event: EventEmitter<Message>;
};
export const History: React.FC<Created> = ({disabled, selectedMail, $event, owner, fromAddress}) => {
  let [open, setOpen] = useState<boolean>(false);
  const [keyword, setKeyword] = useState<string | any>()
  let contentRef = useRef();
  const mails = useInfiniteScroll((d) => AppService.scrollByHistory({
    nextId: d?.nextId ?? 1,
    size: 10,
    owner,
    keyword,
    fromAddress,
  }), {
    isNoMore: d => !d?.hasMore,
    manual: true,
    reloadDeps: [owner, keyword, fromAddress],
    threshold: 300,
    target: contentRef
  });
  useEffect(() => mails.reload(), [open]);
  let data = mails?.data?.list ?? [];
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <TooltipTrigger asChild>
        <Button variant={open ? "secondary" : "ghost"} size="icon" disabled={disabled}>
          <Clock className="h-4 w-4" />
          <span className="sr-only">History</span>
        </Button>
      </TooltipTrigger>
    </PopoverTrigger>
    <PopoverContent className={'w-[435px]'}>
      <div className="relative pb-2">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search" className="pl-8" value={keyword} onChange={e => setKeyword(e?.target?.value)} />
      </div>
      <ScrollArea className={'h-[400px]'} ref={contentRef}>
        <div className={"flex flex-col gap-2"}>
          {data?.length ? data.map(mail =>
              <MailCard selected={selectedMail?.id === mail.id} mail={mail}
                        onClick={(mail) => $event.emit({
                          type: MessageType.UpdateMail,
                          value: mail
                        })} />)
            : <div className={'py-5 px-10 h-full'}><Empty /></div>}
        </div>
      </ScrollArea>
    </PopoverContent>
  </Popover>;
}
