"use client";

import React from "react";
import {
  Avatar,
  Listbox,
  ListboxItem,
  Tabs,
  Tab,
  Link,
  Card,
  CardBody,
  Image,
  ScrollShadow,
} from "@nextui-org/react";
import {Icon} from "@iconify/react";

import MessagingChatHeader from "./messaging-chat-header";
import messageInteractions from "./messaging-interactions";
import dummyImages from "./dummy-images";

export type MessagingChatProfileProps = React.HTMLAttributes<HTMLDivElement> & {
  paginate?: (direction: number) => void;
};

const MessagingChatProfile = React.forwardRef<HTMLDivElement, MessagingChatProfileProps>(
  ({paginate, ...props}, ref) => {
    return (
      <div ref={ref} {...props}>
        <div className="w-full flex-1 flex-col">
          <MessagingChatHeader className="hidden sm:flex lg:hidden" paginate={paginate} />
          <div className="h-dvh w-full overflow-visible border-t-small border-default-200 lg:border-none">
            <ScrollShadow className="flex h-full max-h-full flex-col gap-1 overflow-y-auto p-2">
              <div className="flex flex-col gap-4">
                {/* Profile Info */}
                <div className="flex flex-col items-center px-4 pt-2 text-center">
                  <Avatar
                    className="h-20 w-20"
                    src="https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/avatars/3a906b3de8eaa53e14582edf5c918b5d.jpg"
                  />
                  <h3 className="mt-2 text-small font-semibold text-foreground">Taylor Smith</h3>
                  <span className="text-small font-medium text-default-400">
                    taylor_smith@mail.com
                  </span>
                  <div className="mt-2 flex gap-2">
                    <Link href="#">
                      <Icon
                        className="text-default-400"
                        icon="solar:user-rounded-linear"
                        width={23}
                      />
                    </Link>
                    <Link href="#">
                      <Icon className="text-default-400" icon="solar:map-point-linear" width={22} />
                    </Link>
                    <Link href="#">
                      <Icon
                        className="text-default-400"
                        icon="solar:phone-rounded-linear"
                        width={24}
                      />
                    </Link>
                  </div>
                </div>

                {/* Notes */}
                <div className="px-2">
                  <div className="text-small font-semibold text-foreground">Notes</div>
                  <Listbox aria-label="Notes" variant="flat">
                    <ListboxItem
                      key="internal-issue"
                      classNames={{
                        base: "bg-danger-50 rounded-large  my-1 px-4 h-[42px]",
                        title: "text-danger-800 font-semibold",
                      }}
                    >
                      Internal Issue
                    </ListboxItem>
                    <ListboxItem
                      key="pro-user"
                      classNames={{
                        base: "bg-secondary-50 rounded-large  my-1 px-4 h-[42px]",
                        title: "text-secondary-700 font-semibold",
                      }}
                    >
                      Pro User
                    </ListboxItem>
                    <ListboxItem
                      key="authenticated"
                      classNames={{
                        base: "bg-primary-50 rounded-large  my-1 px-4 h-[42px]",
                        title: "text-primary-700 font-semibold",
                      }}
                    >
                      Authenticated
                    </ListboxItem>
                  </Listbox>
                </div>

                {/* Interaction */}
                <div className="px-2">
                  <div className="text-small font-semibold text-foreground">Interaction</div>
                  <Listbox
                    aria-label="Interaction"
                    itemClasses={{
                      base: "relative w-full rounded-medium bg-content2 my-1 px-4",
                    }}
                    variant="flat"
                  >
                    {messageInteractions.map((interaction) => (
                      <ListboxItem key={interaction.key} textValue={interaction.title}>
                        <div className="flex">
                          <div className="w-full text-small font-semibold text-foreground">
                            {interaction.title}
                          </div>
                          <div className="flex-end flex text-small text-default-400">
                            {interaction.time}
                          </div>
                        </div>
                        <div className="w-full truncate text-small text-default-500">
                          {interaction.message}
                        </div>
                      </ListboxItem>
                    ))}
                  </Listbox>
                </div>

                {/* Media / Links Tabs */}
                <div className="mb-4 px-2">
                  <Tabs
                    fullWidth
                    classNames={{
                      cursor: "group-data-[selected=true]:bg-content1",
                    }}
                  >
                    <Tab key="media" title="Media" />
                    <Tab key="links" title="Links" />
                  </Tabs>
                </div>
              </div>

              {/* Media */}
              <div className="mx-2 rounded-large bg-content1 p-4">
                <div className="overflow-y-hidden">
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-3">
                    {dummyImages.map((image, index) => (
                      <Card key={index} isPressable radius="sm" shadow="sm">
                        <CardBody className="p-0 sm:aspect-[2/1]">
                          <Image
                            removeWrapper
                            alt={image.name}
                            className="w-full object-cover"
                            radius="sm"
                            src={image.src}
                            width="100%"
                          />
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollShadow>
          </div>
        </div>
      </div>
    );
  },
);

MessagingChatProfile.displayName = "MessagingChatProfile";

export default MessagingChatProfile;
