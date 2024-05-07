import React from "react";
import {IMail} from "@/types/http";
import {cn} from "@/lib";
import {Badge} from "../ui/badge";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip";


type Created = {
  mails: IMail[];
  maxSize?: number;
  className?: string;
};
export const MailAddresses: React.FC<Created> = ({mails = [], maxSize, className}) => {
  maxSize = maxSize ?? mails.length;
  let joinSize = mails?.length - maxSize;
  let newMails = mails.slice(0, Math.min(mails.length, maxSize));
  return <div className={cn('flex gap-1', className)}>
    {newMails.map((item, i) => {
      return <>
        <MailAddress mail={item} suffix={i < (newMails.length - 1) ? ',' : undefined} />
      </>;
    })}
    {joinSize > 0 ? <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary">+{joinSize}</Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{mails.map(({address}) => address).join(',')}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider> : undefined}
  </div>;
};


type MailCreated = {
  mail: IMail;
  suffix?: string | JSX.Element;
};
export const MailAddress: React.FC<MailCreated> = ({mail, suffix}) => {
  return <div className="font-semibold">
    <span>{mail?.name}</span>&nbsp;
    <span className={cn('text-xs', 'font-light')}>&lt;{mail?.address}&gt;</span>
    {suffix}
  </div>;
}
