"use client";

import {useMediaQuery} from "usehooks-ts";
import {Avatar, Button, Spacer, useDisclosure, Tooltip} from "@nextui-org/react";
import React from "react";
import {ChatInbox, ChatWindow, ChatProfile, ChatHeader} from "@/components/Message";
import {AnimatePresence, domAnimation, LazyMotion, m} from "framer-motion";
import {cn, Sidebar, SidebarDrawer} from "@/components";
import {Icon} from "@iconify/react";
import messagingSidebarItems from "@/components/Message/messaging-sidebar-items";
import {Logo} from "@/components/logo";


const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 20 : -20,
    opacity: 0,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 20 : -20,
    opacity: 0,
  }),
};

export default () => {
  const [[page, direction], setPage] = React.useState([0, 0]);
  const {isOpen, onOpen, onOpenChange} = useDisclosure();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const {isOpen: isProfileSidebarOpen, onOpenChange: onProfileSidebarOpenChange} = useDisclosure();

  // PC 宽度
  const isCompact = useMediaQuery("(max-width: 1024px)");
  const isMobile = useMediaQuery("(max-width: 768px)");

  const onToggle = React.useCallback(() => setIsCollapsed((prev) => !prev), []);

  const paginate = React.useCallback((newDirection: number) => {
    setPage((prev) => {
      if (!isCompact) return prev;

      const currentPage = prev[0];

      if (currentPage < 0 || currentPage > 2) return [currentPage, prev[1]];

      return [currentPage + newDirection, newDirection];
    });
  }, [isCompact]);

  const content = React.useMemo(() => {
    let component = <ChatInbox page={page} paginate={paginate} />;

    if (isCompact) {
      switch (page) {
        case 1:
          component = <ChatWindow paginate={paginate} />;
          break;
        case 2:
          component = <ChatProfile paginate={paginate} />;
          break;
      }

      return (
        <LazyMotion features={domAnimation}>
          <m.div key={page}
                 animate="center"
                 className="col-span-12"
                 custom={direction}
                 exit="exit"
                 initial="enter"
                 transition={{
                   x: {type: "spring", stiffness: 300, damping: 30},
                   opacity: {duration: 0.2},
                 }}
                 variants={variants}>
            {component}
          </m.div>
        </LazyMotion>
      );
    }

    return (
      <>
        <ChatInbox className="lg:col-span-6 xl:col-span-4" />
        <ChatWindow
          className="lg:col-span-6 xl:col-span-8"
          toggleMessagingProfileSidebar={onProfileSidebarOpenChange}
        />
        <div className="hidden xl:col-span-3">
          <SidebarDrawer
            className="xl:block"
            isOpen={isProfileSidebarOpen}
            sidebarPlacement="right"
            sidebarWidth={320}
            onOpenChange={onProfileSidebarOpenChange}>
            <ChatProfile />
          </SidebarDrawer>
        </div>
      </>
    );
  }, [isCompact, page, paginate, direction, onProfileSidebarOpenChange]);

  return (
    <div className="flex h-dvh max-h-full h-full w-full gap-x-3">
      <SidebarDrawer className={cn("h-auto min-w-[288px] rounded-lg", {"min-w-[76px]": isCollapsed})}
                     hideCloseButton={true}
                     isOpen={isOpen}
                     onOpenChange={onOpenChange}>
        <div className={cn("will-change relative flex h-full w-72 flex-col bg-default-100 p-6 transition-width", {
          "w-[83px] items-center px-[6px] py-6": isCollapsed,
        })}>
          <div className={cn("flex items-center gap-3 pl-2", {
            "justify-center gap-0 pl-0": isCollapsed,
          })}>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground">
              <Logo className="text-background" />
            </div>
            <span className={cn("w-full text-small font-bold uppercase opacity-100", {
              "w-0 opacity-0": isCollapsed,
            })}>
              Acme
            </span>
            <div className={cn("flex-end flex", {hidden: isCollapsed})}>
              <Icon className="cursor-pointer dark:text-primary-foreground/60 [&>g]:stroke-[1px]"
                    icon="solar:round-alt-arrow-left-line-duotone"
                    width={24}
                    onClick={isMobile ? onOpenChange : onToggle} />
            </div>
          </div>
          <Spacer y={6} />
          <div className="flex items-center gap-3 px-3">
            <Avatar isBordered
                    size="sm"
                    src="https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/avatars/e1b8ec120710c09589a12c0004f85825.jpg" />
            <div className={cn("flex max-w-full flex-col", {hidden: isCollapsed})}>
              <p className="text-small font-medium text-foreground">Kate Moore</p>
              <p className="text-tiny font-medium text-default-400">Customer Support</p>
            </div>
          </div>
          <Spacer y={6} />
          <Sidebar defaultSelectedKey="chat"
                   iconClassName="group-data-[selected=true]:text-default-50"
                   isCompact={isCollapsed}
                   itemClasses={{
                     base: "px-3 rounded-large data-[selected=true]:!bg-foreground",
                     title: "group-data-[selected=true]:text-default-50",
                   }}
                   items={messagingSidebarItems} />
          <Spacer y={8} />
          <div className={cn("mt-auto flex flex-col", {
            "items-center": isCollapsed,
          })}>
            {isCollapsed && (
              <Button
                isIconOnly
                className="flex h-10 w-10 text-default-600"
                size="sm"
                variant="light"
                onPress={() => paginate && paginate(page - 1)}
              >
                <Icon
                  className="cursor-pointer dark:text-primary-foreground/60 [&>g]:stroke-[1px]"
                  height={24}
                  icon="solar:round-alt-arrow-right-line-duotone"
                  width={24}
                  onClick={onToggle}
                />
              </Button>
            )}
            <Tooltip content="Support" isDisabled={!isCollapsed} placement="right">
              <Button
                fullWidth
                className={cn(
                  "justify-start truncate text-default-600 data-[hover=true]:text-foreground", {
                    "justify-center": isCollapsed,
                  })}
                isIconOnly={isCollapsed}
                startContent={isCollapsed ? null : (<Icon
                  className="flex-none text-default-600"
                  icon="solar:info-circle-line-duotone"
                  width={24}
                />)}
                variant="light">
                {isCollapsed ? (<Icon className="text-default-500"
                                      icon="solar:info-circle-line-duotone"
                                      width={24} />) : ("Support")}
              </Button>
            </Tooltip>
            <Tooltip content="Log Out" isDisabled={!isCollapsed} placement="right">
              <Button
                className={cn("justify-start text-default-500 data-[hover=true]:text-foreground", {
                  "justify-center": isCollapsed,
                })}
                isIconOnly={isCollapsed}
                startContent={isCollapsed ? null : (<Icon
                  className="flex-none rotate-180 text-default-500"
                  icon="solar:minus-circle-line-duotone"
                  width={24}
                />)}
                variant="light">{isCollapsed ? (<Icon className="rotate-180 text-default-500"
                                                      icon="solar:minus-circle-line-duotone"
                                                      width={24} />)
                : ("Log Out")}</Button>
            </Tooltip>
          </div>
        </div>
      </SidebarDrawer>
      <main className="w-full max-h-full pt-2 pb-2">
        <div
          className="max-h-full h-full grid grid-cols-12 gap-0 overflow-y-hidden p-0 pb-2 sm:rounded-large sm:border-small sm:border-default-200">
          <ChatHeader
            aria-hidden={!isMobile}
            className="col-span-12 sm:hidden"
            page={page}
            paginate={paginate}
            onOpen={onOpen} />
          {isCompact ? (<AnimatePresence custom={direction} initial={false} mode="wait">
            {content}
          </AnimatePresence>) : (content)}
        </div>
      </main>
    </div>
  );
};

