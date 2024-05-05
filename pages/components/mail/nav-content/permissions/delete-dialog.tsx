import React from "react";
import {
  DialogTrigger,
  DialogContent,
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {useRequest} from "ahooks";
import {AppService} from "@/service/http/app";
import {toast} from "@/components/ui/use-toast";
import {Loader2} from "lucide-react";
import {EventEmitter} from "ahooks/lib/useEventEmitter";
import {Message, MessageType} from "@/types/base";

type Created = {
  id: string | number;
  children: React.ReactElement;
  onOpenChange: (open: boolean) => void;
  event$: EventEmitter<Message>
};
export const DeleteDialog: React.FC<Created> = React.forwardRef(({id, event$, children, onOpenChange}) => {
  let $deleteByUserConfig = useRequest(AppService.deleteByUserConfig, {
    manual: true,
    onSuccess: (_) => toast({title: `Success`}),
    onError: (e) => toast({variant: "destructive", title: e?.name, description: e?.message}),
    onFinally: () => event$.emit({type: MessageType.RefreshUserConfig}),
  });
  return <Dialog onOpenChange={onOpenChange}>
    <DialogTrigger asChild>{children}</DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Delete</DialogTitle>
        <DialogDescription>
          Confirm delete account?
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className='pt-4'>
        <Button type="submit" onClick={() => $deleteByUserConfig.run(id)} disabled={$deleteByUserConfig.loading}>
          {$deleteByUserConfig.loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <></>}
          Confirm
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
});
