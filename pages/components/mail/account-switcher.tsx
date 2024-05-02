"use client"

import * as React from "react"

import {cn} from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {IMail} from "@/types/http";
import {LangKit} from "@hocgin/hkit";
import {useMail} from "@/components/mail/use-mail";
import {useMemo} from "react";

interface AccountSwitcherProps {
  isCollapsed: boolean;
  accounts: IMail[];
  defaultValue?: IMail;
  onSelectedAccount: (mail: IMail) => void;
}

export function AccountSwitcher({isCollapsed, accounts, defaultValue, onSelectedAccount}: AccountSwitcherProps) {
  let [selectedAccount, saMaps] = useMemo(() => [
    accounts.find((account) => account.address === defaultValue?.address),
    LangKit.toMap<IMail, string, IMail>(accounts, e => e.address)
  ], [accounts, defaultValue?.address]);
  return (
    <Select value={defaultValue?.address} onValueChange={(selected) => onSelectedAccount?.(saMaps?.[selected])}>
      <SelectTrigger className={cn(
        "flex items-center gap-2 [&>span]:line-clamp-1 [&>span]:flex [&>span]:w-full [&>span]:items-center [&>span]:gap-1 [&>span]:truncate [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0",
        isCollapsed &&
        "flex h-9 w-9 shrink-0 items-center justify-center p-0 [&>span]:w-auto [&>svg]:hidden"
      )} aria-label="Select account">
        <SelectValue placeholder="Select an account">
          {selectedAccount?.icon}
          <span className={cn("ml-2", isCollapsed && "hidden")}>
            {selectedAccount?.name?.length ? selectedAccount?.name : selectedAccount?.address}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {accounts.map((account) => (
          <SelectItem key={account.address} value={account.address}>
            <div className="flex items-center gap-3 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0 [&_svg]:text-foreground">
              {account.icon}
              {account.address}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
