"use client";

import format from "date-fns/format"
import {Archive, Clock, MoreVertical, Trash2,} from "lucide-react"

import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,} from "@/components/ui/dropdown-menu"
import {Button} from "@/components/ui/button"
import {History} from "./history"
import {Separator} from "@/components/ui/separator"
import {Textarea} from "@/components/ui/textarea"
import {Tooltip, TooltipContent, TooltipTrigger,} from "@/components/ui/tooltip"
import {IMail, Mail} from "@/types/http";
import {useRequest} from "ahooks";
import {AppService} from "@/service/http/app";
import {useState} from "react";
import {useToast} from "@/components/ui/use-toast"
import {cn, formatDistanceDay} from "@/lib";
import {Empty} from "@/components/empty";
import {UserAvatar} from "@/components/avatar";
import {EventEmitter} from "ahooks/lib/useEventEmitter";
import {Message, MessageType} from "@/types/base";

interface MailDisplayProps {
  mail: Mail | null;
  selectedOwner?: IMail;
  $event: EventEmitter<Message>;
}

export function MailDisplay({mail, selectedOwner, $event}: MailDisplayProps) {
  const {toast} = useToast()
  const [replyContent, setReplyContent] = useState<string>()
  let sendMail = useRequest(() => AppService.sendMail({
    to: [mail.fromAddress],
    from: selectedOwner,
    subject: `Reply to ${mail.fromAddress}`,
    html: replyContent
  }), {
    manual: true,
    onSuccess: (_) => {
      // 发送成功
      setReplyContent(undefined);
      toast({title: `发送成功`, description: `Reply to ${mail.fromAddress}`});
      // todo 查询页面
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
        <div className="flex flex-1 flex-col">
          <div className="flex items-start p-4">
            <div className="flex items-start gap-4 text-sm">
              <UserAvatar username={fromName} />
              <div className="grid gap-1">
                <div className="font-semibold">
                  <span>{fromName}</span>&nbsp;
                  <span className={cn('text-xs', 'font-light')}>&lt;{fromAddress}&gt;</span>
                </div>
                {/*<div className="line-clamp-1 text-xs">*/}
                {/*  {mail.subject}*/}
                {/*</div>*/}
                <div className="line-clamp-1 text-xs font-medium">
                  {mail.subject}
                </div>
              </div>
            </div>
            {mail.date && (
              <div className="ml-auto text-xs text-muted-foreground">
                {formatDistanceDay(new Date(mail.date))}
              </div>
            )}
          </div>
          <Separator />
          <div className="flex-1 whitespace-pre-wrap p-4 text-sm">
            {mail.text}
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
                  }} size="sm" className="ml-auto">
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
