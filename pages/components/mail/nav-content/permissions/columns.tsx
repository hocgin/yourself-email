import {Button} from "@/components/ui/button";
import {ColumnDef} from "@tanstack/react-table";
import {Checkbox} from "@/components/ui/checkbox";
import {Badge} from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {MoreHorizontal} from "lucide-react"
import {DeleteDialog} from "@/components/mail/nav-content/permissions/delete-dialog";
import {EditDialog} from "@/components/mail/nav-content/permissions/edit-dialog";
import {ViewDialog} from "@/components/mail/nav-content/permissions/view-dialog";
import React from "react";
import {EventEmitter} from "ahooks/lib/useEventEmitter";
import {Message} from "@/types/base";

export type Row = {
  id: string
  email: string;
  isSuperAdmin: boolean
  readMail: string[];
  sentMail: string[];
}

export function columns(event$: EventEmitter<Message>) {
  const columns: ColumnDef<Row>[] = [{
    accessorKey: "email",
    header: "Email",
  }, {
    accessorKey: "isSuperAdmin",
    header: "Super Admin",
    cell: ({row}) => {
      return <Checkbox disabled checked={row?.original?.isSuperAdmin} />
    }
  }, {
    accessorKey: "readMail",
    header: "Read Mail List",
    cell: ({row}) => {
      let original = row.original;
      let mails = original?.readMail ?? [];
      return renderMailBadge(mails);
    }
  }, {
    accessorKey: "sentMail",
    header: "Sent Mail List",
    cell: ({row}) => {
      let original = row.original;
      let mails = original?.sentMail ?? [];
      return renderMailBadge(mails);
    }
  }, {
    accessorKey: "Action",
    enableHiding: false,
    cell: ({row}) => {
      let original = row.original;
      const focusRef = React.useRef(null);
      const dropdownTriggerRef = React.useRef(null);
      const [dropdownOpen, setDropdownOpen] = React.useState(false);
      const [hasOpenDialog, setHasOpenDialog] = React.useState(false);

      function onSelect() {
        focusRef.current = dropdownTriggerRef.current;
      }

      function handleDialogItemOpenChange(open: boolean) {
        setHasOpenDialog(open);
        if (open === false) {
          setDropdownOpen(false);
        }
      }

      return (
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0" ref={dropdownTriggerRef}>
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" hidden={hasOpenDialog}
                               onCloseAutoFocus={(event) => {
                                 if (focusRef.current) {
                                   focusRef.current.focus();
                                   focusRef.current = null;
                                   event.preventDefault();
                                 }
                               }}>
            <ViewDialog data={original as any} onOpenChange={handleDialogItemOpenChange}>
              <DropdownMenuItem onSelect={(event) => {
                event.preventDefault();
                onSelect && onSelect();
              }}>View</DropdownMenuItem>
            </ViewDialog>
            <EditDialog event$={event$} data={original as any} id={original.id}
                        onOpenChange={handleDialogItemOpenChange}>
              <DropdownMenuItem disabled={row.original.isSuperAdmin}
                                onSelect={(event) => {
                                  event.preventDefault();
                                  onSelect && onSelect();
                                }}>Edit</DropdownMenuItem>
            </EditDialog>
            <DropdownMenuSeparator />
            <DeleteDialog event$={event$} id={original.id} onOpenChange={handleDialogItemOpenChange}>
              <DropdownMenuItem disabled={row.original.isSuperAdmin}
                                className={'text-red-500'}
                                onSelect={(event) => {
                                  event.preventDefault();
                                  onSelect && onSelect();
                                }}>Delete</DropdownMenuItem>
            </DeleteDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  }]
  return columns;
}


function renderMailBadge(mails: string[]) {
  let newMails = mails.slice(0, Math.min(2, mails.length));
  let size = mails?.length - newMails?.length;
  let elements = newMails.map(e => <Badge variant="secondary">{e}</Badge>);
  if (size > 0) {
    elements.push(<Badge variant="secondary">+{size}</Badge>)
  }
  return <div className={'flex flex-row gap-1'}>{elements}</div>;
}
