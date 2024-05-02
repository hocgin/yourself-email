import React from "react";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {cn} from "@/lib";

type Created = {
  username: string;
  src?: string;
  radius?: string;
  className?: string;
  size?: string;
};
export const UserAvatar: React.FC<Created> = ({username, ...props}) => {

  let title = username.split(" ").map((chunk) => chunk[0]).join("");
  return <Avatar {...props} className={cn(
    props?.size === 'sm' ? 'w-7 h-7' : undefined,
    props?.radius === 'small' ? 'rounded-sm' : undefined,
    props?.className)}>
    <AvatarImage alt={username} />
    <AvatarFallback className={cn(
      props?.size === 'sm' ? 'w-7 h-7' : undefined,
      props?.radius === 'small' ? 'rounded-sm' : undefined)}>
      {title}
    </AvatarFallback>
  </Avatar>;
}
