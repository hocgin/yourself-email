"use client";

import React from "react";
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  ScrollShadow,
} from "@nextui-org/react";
import {Icon} from "@iconify/react";

import MessagingChatMessage from "./messaging-chat-message";
import MessagingChatInput from "./messaging-chat-input";
import MessagingChatHeader from "./messaging-chat-header";
import messagingChatConversations from "./messaging-chat-conversations";

export type MessagingChatWindowProps = React.HTMLAttributes<HTMLDivElement> & {
  paginate?: (page: number) => void;
  toggleMessagingProfileSidebar?: () => void;
};

const MessagingChatWindow = React.forwardRef<HTMLDivElement, MessagingChatWindowProps>(
  ({paginate, toggleMessagingProfileSidebar, ...props}, ref) => {
    return (
      <div ref={ref} {...props}>
        <div className="w-full flex-col sm:border-default-200 lg:border-l-small xl:border-r-small">
          <MessagingChatHeader className="hidden sm:flex lg:hidden" paginate={paginate} />
          <div className="h-17 flex items-center gap-2 border-y-small border-default-200 p-3 sm:p-4 lg:border-t-0">
            <div className="w-full">
              <div className="text-small font-semibold">Application for launch promotion</div>
              <div className="mt-1 text-small text-default-500">Via Web</div>
            </div>
            <div className="flex-end flex cursor-pointer">
              <Dropdown placement="bottom-end">
                <DropdownTrigger>
                  <Button isIconOnly className="min-w-6 text-default-500" variant="light">
                    <Icon icon="solar:menu-dots-bold" width={24} />
                  </Button>
                </DropdownTrigger>
                <DropdownMenu
                  onAction={(key: React.Key) => {
                    if (key === "view_profile") {
                      if (toggleMessagingProfileSidebar) {
                        toggleMessagingProfileSidebar();
                      } else {
                        paginate?.(1);
                      }
                    }
                  }}
                >
                  <DropdownItem key="view_profile" className="xl:hidden">
                    View Profile
                  </DropdownItem>
                  <DropdownItem key="mark_as_spam">Mark as spam</DropdownItem>
                  <DropdownItem key="delete" className="text-danger">
                    Delete
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </div>
          </div>
          <div className="flex w-full overflow-visible">
            <ScrollShadow
              className="flex max-h-[calc(100vh-250px)] flex-col gap-6 px-6 py-4 lg:max-h-[calc(100vh-250px)]">
              {messagingChatConversations.map((messagingChatConversation, idx) => (
                <MessagingChatMessage key={idx} {...messagingChatConversation} />
              ))}
            </ScrollShadow>
          </div>
          <div className="mx-2 mt-auto flex flex-col">
            <MessagingChatInput />
          </div>
        </div>
      </div>
    );
  },
);

MessagingChatWindow.displayName = "MessagingChatWindow";

export default MessagingChatWindow;
