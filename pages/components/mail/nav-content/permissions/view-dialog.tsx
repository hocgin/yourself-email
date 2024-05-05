import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {Button} from "@/components/ui/button";
import {z} from "zod";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import MultipleSelector from "@/components/ui-expansions/multiple-selector";
import {Input} from "@/components/ui/input";
import type {Row} from "@/components/mail/nav-content/permissions/columns";
import {Checkbox} from "@/components/ui/checkbox";

const FormSchema = z.object({
  email: z.string().email(),
  readMail: z.array(z.any()),
  sentMail: z.array(z.any()),
  isSuperAdmin: z.any(),
});

type Created = {
  data: Row | any;
  children: React.ReactElement;
  onOpenChange: (open: boolean) => void;
};
export const ViewDialog: React.FC<Created> = React.forwardRef(({children, data, onOpenChange}) => {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      ...data,
      readMail: (data?.readMail ?? []).map(e => ({label: e, value: e})),
      sentMail: (data?.sentMail ?? []).map(e => ({label: e, value: e})),
    }
  });

  return <Dialog onOpenChange={onOpenChange}>
    <DialogTrigger asChild>{children}</DialogTrigger>
    <DialogContent className="sm:max-w-[500px]">
      <Form {...form}>
        <form>
          <DialogHeader>
            <DialogTitle>View</DialogTitle>
          </DialogHeader>
          <div className={'flex gap-2 flex-col pt-2'}>
            <FormField control={form.control} name="email"
                       render={({field}) => <FormItem className={'space-y-0 flex flex-row gap-1 items-center'}>
                         <FormLabel className={'w-[100px]'}>Email</FormLabel>
                         <FormControl>
                           <Input className={'flex-1'} type="email" placeholder="Email Account" value={field.value}
                                  disabled
                                  onChange={field.onChange} />
                         </FormControl>
                         <FormMessage />
                       </FormItem>} />
            <FormField control={form.control} name="isSuperAdmin"
                       render={({field}) => <FormItem className={'space-y-0 flex flex-row gap-1 items-center'}>
                         <FormLabel className={'w-[100px]'}>Super Admin</FormLabel>
                         <FormControl>
                           <Checkbox disabled checked={field.value} onCheckedChange={field.onChange} />
                         </FormControl>
                         <FormMessage />
                       </FormItem>} />
            <FormField control={form.control} name="readMail"
                       render={({field}) => <FormItem className={'space-y-0 flex flex-row gap-1 items-center'}>
                         <FormLabel className={'w-[100px]'}>Read Mail</FormLabel>
                         <FormControl>
                           <MultipleSelector commandProps={{className: 'flex-1'}} placeholder="Read Mail List" creatable
                                             disabled value={field.value} onChange={field.onChange} />
                         </FormControl>
                         <FormMessage />
                       </FormItem>} />
            <FormField
              control={form.control}
              name="sentMail"
              render={({field}) => <FormItem className={'space-y-0 flex flex-row gap-1 items-center'}>
                <FormLabel className={'w-[100px]'}>Sent Mail</FormLabel>
                <FormControl>
                  <MultipleSelector commandProps={{className: 'flex-1'}} placeholder="Sent Mail List" creatable disabled
                                    value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>} />
          </div>
          <DialogFooter className='pt-4'>
            <Button type="button" onClick={() => onOpenChange(false)}>Confirm</Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  </Dialog>
});
