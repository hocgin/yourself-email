"use client";

import type {MessagingChatListProps} from "./messaging-chat-list";

import React, {useRef} from "react";
import {
  Avatar,
  Badge,
  ScrollShadow,
  Listbox,
  ListboxItem,
  Input,
  Tabs,
  Tab,
} from "@nextui-org/react";
import {Icon} from "@iconify/react";

import MessagingChatHeader from "./messaging-chat-header";
import {cn} from "@/components";
import {useInfiniteScroll} from "ahooks";
import {AppService} from "@/service/http/app";

export type MessageChatInboxProps = React.HTMLAttributes<HTMLDivElement> & {
  page?: number;
  paginate?: (direction: number) => void;
};

const MessageChatInbox = React.forwardRef<HTMLDivElement, MessageChatInboxProps>(({page, paginate, ...props}, ref) => {
    const listRef = useRef<any>();
    const {data, loading, loadingMore, loadMore} = useInfiniteScroll((d) =>
      AppService.scrollByMail({nextId: d?.nextId ?? 1, size: 10 * 6}), {
      isNoMore: d => !d?.hasMore,
      threshold: 300,
      target: listRef
    });
    console.log('data', {data});
    return (
      <div ref={ref} {...props}>
        <div className="h-dvh w-full overflow-visible">
          <MessagingChatHeader className="hidden sm:flex" page={page} paginate={paginate} />
          <div className="mb-6 flex flex-col gap-4 px-3 sm:px-6">
            <div>
              <div className="mb-4 lg:mb-4">
                <Input aria-label="Search" labelPlacement="outside" placeholder="Search..." radius="md"
                       startContent={<Icon className="text-default-500 [&>g]:stroke-[2px]"
                                           icon="solar:magnifer-linear"
                                           width={18} />}
                       variant="bordered" />
              </div>
              <div className="mt-4">
                <Tabs fullWidth classNames={{
                  cursor: "group-data-[selected=true]:bg-content1",
                }}>
                  <Tab key="inbox" title="Inbox" />
                  <Tab key="unread" title="Unread" />
                </Tabs>
              </div>
            </div>
          </div>
          <ScrollShadow ref={listRef}
                        className="flex h-full max-h-[calc(100vh-280px)] flex-col gap-6 overflow-y-auto px-3">
            <Listbox classNames={{base: "p-0", list: "overflow-scroll"}}
                     items={data?.records ?? []} variant="flat">
              {(item: MessagingChatListProps) => (
                <ListboxItem key={item.id}
                             className={cn("mb-2 px-4", {
                               "bg-default-100": item.active,
                             })}
                             endContent={<div className="text-small text-default-400">{item.time}</div>}
                             textValue={item.name}
                             onPress={() => paginate?.(1)}>
                  <div className="flex items-center gap-2 py-1">
                    {item.count == 0 ? (
                      <Avatar alt={item.name} className="flex-shrink-0"
                              size="sm" src={item.avatar} />
                    ) : (
                      <Badge color="danger" content={item.count}>
                        <Avatar alt={item.name} className="flex-shrink-0"
                                size="sm" src={item.avatar} />
                      </Badge>
                    )}
                    <div className="ml-2 min-w-0 flex-1">
                      <div className="text-small font-semibold text-default-foreground">
                        {item.name}
                      </div>
                      <div className="truncate text-small text-default-500">{item.message}</div>
                    </div>
                  </div>
                </ListboxItem>
              )}
            </Listbox>
          </ScrollShadow>
        </div>
      </div>
    );
  },
);

MessageChatInbox.displayName = "MessageChatInbox";

export default MessageChatInbox;
