"use client";

import {Archive, CornerDownRight, Loader2, MoreVertical, Trash2, Captions} from "lucide-react"

import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,} from "@/components/ui/dropdown-menu"
import {Button} from "@/components/ui/button"
import {History} from "./history"
import {Separator} from "@/components/ui/separator"
import {Textarea} from "@/components/ui/textarea"
import {Tooltip, TooltipContent, TooltipTrigger,} from "@/components/ui/tooltip"
import {IMail, Mail} from "@/types/http";
import {useRequest} from "ahooks";
import {AppService} from "@/service/http/app";
import React, {useState} from "react";
import {useToast} from "@/components/ui/use-toast"
import {cn, formatDate} from "@/lib";
import {Empty} from "@/components/empty";
import {UserAvatar} from "@/components/avatar";
import {EventEmitter} from "ahooks/lib/useEventEmitter";
import {Message, MessageType} from "@/types/base";
import {sanitize} from "@/lib/domkit";
import {MailAddress, MailAddresses} from "../mails";
import {Popover, PopoverTrigger, PopoverContent} from "../ui/popover";
import {Label} from "../ui/label";

interface MailDisplayProps {
  mail: Mail | null;
  selectedOwner?: IMail;
  $event: EventEmitter<Message>;
}

export function MailDisplay({mail, selectedOwner, $event}: MailDisplayProps) {
  const {toast} = useToast()
  const [replyContent, setReplyContent] = useState<string>()
  let title = mail?.subject ?? mail?.fromAddress?.address;
  let sendMail = useRequest(() => AppService.replyMail(mail.id, {
    subject: `Re: ${title}`,
    html: replyContent
  }), {
    manual: true,
    onSuccess: (_) => {
      // 发送成功
      setReplyContent(undefined);
      toast({title: `Success`, description: `Reply to ${title}`});
    },
    onError: (e) => toast({variant: "destructive", title: e?.name, description: e?.message}),
  });
  let unread = useRequest(() => AppService.unread(mail?.id), {
    manual: true,
    onSuccess: (_) => {
      mail.isRead = false;
      $event.emit({type: MessageType.UpdateMail, value: mail});
      toast({title: `Mask as unread`});
    },
    onError: (e) => toast({variant: "destructive", title: e?.name, description: e?.message}),
  });
  let setTrash = useRequest((id, isTrash: boolean) => AppService.setTrash(id, isTrash), {
    manual: true,
    onSuccess: (_, [id, isTrash]) => {
      mail.isTrash = isTrash;
      $event.emit({type: MessageType.UpdateMail, value: mail});
      toast({title: isTrash ? `Move to Trash` : `Remove From Trash`});
    },
    onError: (e) => toast({variant: "destructive", title: e?.name, description: e?.message}),
  });
  let setArchive = useRequest((id, isArchive: boolean) => AppService.setArchive(id, isArchive), {
    manual: true,
    onSuccess: (_, [id, isArchive]) => {
      mail.isArchive = isArchive;
      $event.emit({type: MessageType.UpdateMail, value: mail});
      toast({title: isArchive ? `Move to Archive` : 'Remove From Archive'})
    },
    onError: (e) => toast({variant: "destructive", title: e?.name, description: e?.message}),
  });
  const today = new Date()
  let fromName = mail?.fromAddress?.name;
  let fromAddress = mail?.fromAddress?.address;
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center p-2">
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={mail?.isArchive ? "secondary" : "ghost"} size="icon" disabled={!mail}
                      onClick={() => setArchive.run(mail?.id, !mail?.isArchive)}>
                <Archive className="h-4 w-4" />
                <span className="sr-only">Archive</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Archive</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={mail?.isTrash ? "secondary" : "ghost"} size="icon" disabled={!mail}
                      onClick={() => setTrash.run(mail?.id, !mail?.isTrash)}>
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Move to trash</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Trash</TooltipContent>
          </Tooltip>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Tooltip>
            <History fromAddress={mail?.fromAddress?.address} owner={mail?.owner} $event={$event}
                     selectedMail={mail} disabled={!mail} />
            <TooltipContent>History</TooltipContent>
          </Tooltip>
        </div>
        <Separator orientation="vertical" className="mx-2 h-6" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" disabled={!mail}>
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">More</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={unread.run}>Mark as unread</DropdownMenuItem>
            {/*<DropdownMenuItem>Star thread</DropdownMenuItem>*/}
            {/*<DropdownMenuItem>Add label</DropdownMenuItem>*/}
            {/*<DropdownMenuItem>Mute thread</DropdownMenuItem>*/}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Separator />
      {mail ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex items-start p-4 gap-1">
            <div className="flex items-start gap-4 text-sm">
              <UserAvatar username={fromName} />
              <div className="grid gap-1">
                <div className={'flex gap-1 items-center'}>
                  <MailAddress mail={mail.fromAddress} />
                  <Popover>
                    <PopoverTrigger><Captions className={'h-3 w-3'} /></PopoverTrigger>
                    <PopoverContent className="w-[300px]">
                      <div className="grid gap-5 text-xs">
                        <div className="grid grid-cols-3 items-center gap-4">
                          <div>From</div>
                          <div className={'col-span-2'}><MailAddress mail={mail.fromAddress} /></div>
                        </div>
                        <div className="grid grid-cols-3 items-center gap-4">
                          <div>To</div>
                          <div className={'col-span-2'}><MailAddresses mails={mail.toAddress} className={'flex-col'} />
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex line-clamp-1 text-xs items-center">
                  <CornerDownRight className={'h-3 w-3'} />&nbsp;<MailAddresses mails={mail.toAddress} />
                </div>
                <div className="line-clamp-1 text-xs font-medium">
                  {mail.subject}
                </div>
              </div>
            </div>
            {mail.date && (
              <div className="ml-auto text-xs text-muted-foreground">
                {formatDate(new Date(mail.date))}
              </div>
            )}
          </div>
          <Separator />
          <div className="flex-1 p-4 overflow-y-auto">
            <div className={'html-content'} dangerouslySetInnerHTML={sanitize(mail?.html) ?? {__html: mail?.text}} />
          </div>
          <Separator className="mt-auto" />
          <div className="p-4">
            <form>
              <div className="grid gap-4">
                <Textarea className="p-4" onChange={e => setReplyContent(e?.target?.value)}
                          placeholder={`Reply ${fromName}...`} />
                <div className="flex items-center">
                  <Button onClick={(e) => {
                    e.preventDefault();
                    sendMail.run();
                  }} size="sm" className="ml-auto" disabled={sendMail?.loading}>
                    {sendMail.loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <></>}
                    Send
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : (<div className='py-5 px-10 h-full'><Empty /></div>)}
    </div>
  )
}
