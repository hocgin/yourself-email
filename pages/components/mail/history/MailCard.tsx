import {Avatar, AvatarImage, AvatarFallback} from "@/components/ui/avatar"
import {CalendarDays} from "lucide-react"
import React from "react";
import {UserAvatar} from "@/components/avatar";
import {Mail} from "@/types/http";
import format from "date-fns/format";
import {Button} from "@/components/ui/button";
import {cn} from "@/lib";

type Created = {
  mail: Mail;
  selected: boolean;
  onClick: (mail: Mail) => void;
};
export const MailCard: React.FC<Created> = ({mail, selected, onClick}) => {
  return <div className={cn('flex justify-between space-x-4 rounded-lg p-3 border', selected ? 'bg-muted' : undefined)}>
    <div className={'flex justify-center items-center'}>
      <UserAvatar className={'w-10 h-10'} username={mail?.fromAddress?.name ?? mail?.fromAddress?.address} />
    </div>
    <div className="space-y-1 flex-1">
      <h4 className="text-sm font-semibold">{mail?.subject}</h4>
      <p className="text-sm">
        {mail?.text}
      </p>
      <div className="flex items-center pt-2">
        <CalendarDays className="mr-2 h-4 w-4 opacity-70" />{" "}
        <span className="text-xs text-muted-foreground">
         {format(new Date(mail.date), "PPpp")}
        </span>
      </div>
    </div>
    <div className='flex items-center justify-center'>
      <Button onClick={() => onClick?.(mail)}>View</Button>
    </div>
  </div>
}
