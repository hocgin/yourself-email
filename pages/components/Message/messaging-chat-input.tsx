"use client";

import type {InputProps} from "@nextui-org/react";

import React from "react";
import {Button, Input, Tooltip} from "@nextui-org/react";
import {Icon} from "@iconify/react";

export interface MessagingChatInputProps extends InputProps {}

const MessagingChatInput = React.forwardRef<HTMLInputElement, MessagingChatInputProps>(
  (props, ref) => {
    const [message, setMessage] = React.useState<string>("");

    return (
      <Input
        ref={ref}
        aria-label="message"
        classNames={{
          innerWrapper: "items-center",
          label: "hidden",
          input: "py-0 text-medium",
          inputWrapper: "h-15 py-[10px]",
        }}
        endContent={
          <div className="flex">
            {!message && (
              <Tooltip showArrow content="Speak">
                <Button isIconOnly radius="full" variant="light">
                  <Icon className="text-default-500" icon="solar:microphone-3-linear" width={20} />
                </Button>
              </Tooltip>
            )}
            <Tooltip showArrow content="Send message">
              <div className="flex h-10 flex-col justify-center">
                <Button
                  isIconOnly
                  className="h-[30px] w-[30px] min-w-[30px] bg-foreground leading-[30px]"
                  radius="lg"
                >
                  <Icon
                    className="cursor-pointer text-default-50 [&>path]:stroke-[2px]"
                    icon="solar:arrow-up-linear"
                    width={20}
                  />
                </Button>
              </div>
            </Tooltip>
          </div>
        }
        placeholder=""
        radius="lg"
        startContent={
          <Tooltip showArrow content="Add file">
            <Button isIconOnly radius="full" variant="light">
              <Icon className="text-default-500" icon="solar:paperclip-linear" width={20} />
            </Button>
          </Tooltip>
        }
        value={message}
        variant="bordered"
        onValueChange={setMessage}
        {...props}
      />
    );
  },
);

MessagingChatInput.displayName = "MessagingChatInput";

export default MessagingChatInput;
