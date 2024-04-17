"use client";

import type {MessagingChatListProps} from "./messaging-chat-list";

import React, {useRef, useState} from "react";
import {
  Avatar,
  Badge,
  ScrollShadow,
  Listbox,
  ListboxItem,
  Input,
  Tabs,
  Tab, Spinner,
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
    let [params, setParams] = useState({
      owner: 'cc@hocg.in',
      onlyUnread: false,
      keyword: undefined
    });
    const listRef = useRef<any>();
    const {data, loading, loadingMore, loadMore} = useInfiniteScroll((d) =>
      AppService.scrollByChat({nextId: d?.nextId ?? 1, size: 10 * 6, ...params}), {
      isNoMore: d => !d?.hasMore,
      reloadDeps: [params],
      threshold: 300,
      target: listRef
    });
    return (
      <div ref={ref} {...props}>
        <div className="h-dvh w-full overflow-visible">
          <MessagingChatHeader className="hidden sm:flex" page={page} paginate={paginate} />
          <div className="mb-6 flex flex-col gap-4 px-3 sm:px-6">
            <div>
              <div className="mb-4 lg:mb-4">
                <Input aria-label="Search" labelPlacement="outside" placeholder="Search..." radius="md"
                       onValueChange={keyword => setParams((params) => ({...params, keyword}))}
                       startContent={<Icon className="text-default-500 [&>g]:stroke-[2px]" icon="solar:magnifer-linear"
                                           width={18} />}
                       variant="bordered" />
              </div>
              <div className="mt-4">
                <Tabs fullWidth classNames={{
                  cursor: "group-data-[selected=true]:bg-content1",
                }} onSelectionChange={key => setParams((params) => ({...params, onlyUnread: key === 'unread'}))}>
                  <Tab key="inbox" title="Inbox" />
                  <Tab key="unread" title="Unread" />
                </Tabs>
              </div>
            </div>
          </div>
          <ScrollShadow ref={listRef}
                        className="flex h-full max-h-[calc(100vh-280px)] flex-col gap-6 overflow-y-auto px-3">
            {loading ? <Spinner /> : <>
              <Listbox classNames={{base: "p-0", list: "overflow-scroll"}}
                       items={data?.records ?? []} variant="flat">
                {(item: MessagingChatListProps) => {
                  let name = item?.fromAddress?.name;
                  let message = item.text;
                  let avatarUrl = item.avatar;
                  let unreadCount = item.unreadCount;
                  return (<ListboxItem key={item.id}
                                       className={cn("mb-2 px-4", {
                                         "bg-default-100": item.active,
                                       })}
                                       endContent={<div className="text-small text-default-400">{item.time}</div>}
                                       textValue={name}
                                       onPress={() => paginate?.(1)}>
                    <div className="flex items-center gap-2 py-1">
                      {unreadCount == 0 ? (
                        <Avatar alt={name} name={name} className="flex-shrink-0" size="sm" src={avatarUrl} />
                      ) : (<Badge color="danger" content={unreadCount}>
                        <Avatar alt={name} name={name} className="flex-shrink-0" size="sm" src={avatarUrl} />
                      </Badge>)}
                      <div className="ml-2 min-w-0 flex-1">
                        <div className="text-small font-semibold text-default-foreground">
                          {name}
                        </div>
                        <div className="truncate text-small text-default-500">{message}</div>
                      </div>
                    </div>
                  </ListboxItem>);
                }}
              </Listbox>
            </>}
            {loadingMore ? <Spinner /> : <></>}
          </ScrollShadow>
        </div>
      </div>
    );
  },
);

MessageChatInbox.displayName = "MessageChatInbox";

export default MessageChatInbox;
