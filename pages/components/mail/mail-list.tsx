"use client";

import React, {ComponentProps} from "react"
import {cn, formatDistanceDay, stripHtml} from "@/lib/utils"
import {Badge} from "@/components/ui/badge"
import {ScrollArea} from "@/components/ui/scroll-area"
import {Mail} from "@/types/http";
import {Empty} from '@/components/empty';

interface MailListProps {
  items: Mail[];
  selected?: string;
  onClick?: (item: Mail) => void;
  contentRef: React.MutableRefObject<any>;
}

export function MailList({contentRef, items, selected, onClick}: MailListProps) {
  let isEmpty = !items?.length;
  return (
    <ScrollArea className="h-full" ref={contentRef}>
      <div className={cn("flex flex-col gap-2 p-4 pt-0", isEmpty ? "items-center justify-center" : null)}>
        {isEmpty ? <Empty /> : items.map((item) => (<button key={item.id} className={cn(
          "flex flex-col items-start gap-2 rounded-lg border p-3 text-left text-sm transition-all hover:bg-accent",
          selected === item.id && "bg-muted"
        )} onClick={() => onClick(item)}>
          <div className="flex w-full flex-col gap-1">
            <div className="flex items-center">
              <div className="flex items-center gap-2">
                <div className="font-semibold">
                  <span>{item.fromAddress?.name}</span>&nbsp;
                  <span className={cn('text-xs', 'font-light')}>&lt;{item.fromAddress?.address}&gt;</span>
                </div>
                {!item.isRead && (
                  <span className="flex h-2 w-2 rounded-full bg-blue-600" />
                )}
              </div>
              <div
                className={cn("ml-auto text-xs", selected === item.id ? "text-foreground" : "text-muted-foreground")}>
                {formatDistanceDay(new Date(item.date))}
              </div>
            </div>
            <div className="text-xs font-medium">{item.subject}</div>
          </div>
          <div className="line-clamp-2 text-xs text-muted-foreground">
            {stripHtml(item?.text)?.substring?.(0, 300)}
          </div>
          {item?.labels?.length ? (
            <div className="flex items-center gap-2">
              {item.labels.map((label) => (
                <Badge key={label} variant={getBadgeVariantFromLabel(label)}>
                  {label}
                </Badge>
              ))}
            </div>
          ) : null}
        </button>))}
      </div>
    </ScrollArea>
  )
}

function getBadgeVariantFromLabel(
  label: string
): ComponentProps<typeof Badge>["variant"] {
  if (["work"].includes(label.toLowerCase())) {
    return "default"
  }

  if (["personal"].includes(label.toLowerCase())) {
    return "outline"
  }

  return "secondary"
}
