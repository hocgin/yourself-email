import {Chip} from "@nextui-org/react";
import {Icon} from "@iconify/react";

import {type SidebarItem} from "../Sidebar";

/**
 * Please check the https://nextui.org/docs/guide/routing to have a seamless router integration
 */
const items: SidebarItem[] = [
  {
    key: "home",
    href: "/home",
    icon: "solar:home-2-linear",
    title: "Home",
  },
  {
    key: "chat",
    href: "/chat",
    icon: "solar:chat-round-dots-linear",
    title: "Chat",
  },
  {
    key: "projects",
    href: "/projects",
    icon: "solar:widget-2-outline",
    title: "Projects",
    endContent: (
      <Icon className="text-default-500" icon="solar:add-circle-line-duotone" width={24} />
    ),
  },
  {
    key: "tasks",
    href: "/tasks",
    icon: "solar:checklist-minimalistic-outline",
    title: "Tasks",
    endContent: (
      <Icon className="text-default-500" icon="solar:add-circle-line-duotone" width={24} />
    ),
  },
  {
    key: "team",
    href: "/team",
    icon: "solar:users-group-two-rounded-outline",
    title: "Team",
  },
  {
    key: "tracker",
    href: "/tracker",
    icon: "solar:sort-by-time-linear",
    title: "Tracker",
    endContent: (
      <Chip
        classNames={{
          base: "bg-foreground",
          content: "text-default-50",
        }}
        size="sm"
        variant="flat"
      >
        New
      </Chip>
    ),
  },
  {
    key: "analytics",
    href: "/analytics",
    icon: "solar:chart-outline",
    title: "Analytics",
  },
  {
    key: "perks",
    href: "/perks",
    icon: "solar:gift-linear",
    title: "Perks",
    endContent: (
      <Chip
        classNames={{
          base: "bg-foreground",
          content: "text-default-50",
        }}
        size="sm"
        variant="flat"
      >
        3
      </Chip>
    ),
  },
  {
    key: "expenses",
    href: "/expenses",
    icon: "solar:bill-list-outline",
    title: "Expenses",
  },
];

export default items;
