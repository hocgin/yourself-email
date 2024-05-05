import React from "react";
import {ResizablePanel} from "@/components/ui/resizable";
import {DataTable} from "./data-table";
import {columns} from "./columns";
import {Input} from "@/components/ui/input";
import {Search} from "lucide-react";
import {AddDialog} from "@/components/mail/nav-content/permissions/add-dialog";
import {useEventEmitter, useRequest} from "ahooks";
import {AppService} from "@/service/http/app";
import {toast} from "@/components/ui/use-toast";
import {Message, MessageType} from "@/types/base";

type Created = {
  defaultLayout: number[];
};
export const PermissionsContent: React.FC<Created> = ({defaultLayout, ...props}) => {
  let event$ = useEventEmitter<Message>();
  let {data, refresh, run} = useRequest((keyword: string) => AppService.pagingByUserConfig({keyword}), {
    onError: (e) => toast({variant: "destructive", title: e?.name, description: e?.message}),
  });
  event$.useSubscription(async (message) => {
    if (message?.type === MessageType.RefreshUserConfig) {
      refresh();
    }
  });

  return <ResizablePanel defaultSize={100 - defaultLayout[0]} minSize={30}>
    <div className={'w-2/3 space-y-2 mx-auto my-10'}>
      <div className="flex items-center relative justify-between">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Filter emails..." className="max-w-sm pl-8"
               onChange={(e: any) => run(e?.target?.value)} />
        <AddDialog event$={event$} />
      </div>
      <DataTable columns={columns(event$)} data={data ?? []} />
    </div>
  </ResizablePanel>;
};
