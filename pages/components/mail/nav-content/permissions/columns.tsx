import {Button} from "@/components/ui/button";
import {ColumnDef} from "@tanstack/react-table";
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

export type Row = {
  id: string
  email: string;
  isSuperAdmin: boolean
  readMail: string;
  sentMail: string;
}
export const columns: ColumnDef<Row>[] = [{
  accessorKey: "email",
  header: "Email",
}, {
  accessorKey: "isSuperAdmin",
  header: "Super Admin",
}, {
  accessorKey: "readMail",
  header: "Read Mail List",
}, {
  accessorKey: "sentMail",
  header: "Sent Mail List",
}, {
  accessorKey: "Action",
  enableHiding: false,
  cell: ({row}) => {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>View</DropdownMenuItem>
          <DropdownMenuItem disabled={row.original.isSuperAdmin}>Edit</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={row.original.isSuperAdmin}>Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  },
}]
