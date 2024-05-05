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
import {Form, FormControl, FormField, FormItem, FormMessage} from "@/components/ui/form";
import MultipleSelector from "@/components/ui-expansions/multiple-selector";
import {Input} from "@/components/ui/input";
import {useRequest} from "ahooks";
import {AppService} from "@/service/http/app";
import {toast} from "@/components/ui/use-toast";
import {Loader2} from "lucide-react";
import {EventEmitter} from "ahooks/lib/useEventEmitter";
import {Message, MessageType} from "@/types/base";

const FormSchema = z.object({
  email: z.string().email(),
  readMail: z.array(z.any()),
  sentMail: z.array(z.any()),
});

type Created = {
  event$: EventEmitter<Message>;
};
export const AddDialog: React.FC<Created> = ({event$}) => {
  let $addUserConfig = useRequest(AppService.addUserConfig, {
    manual: true,
    onSuccess: (_) => toast({title: `Success`}),
    onError: (e) => toast({variant: "destructive", title: e?.name, description: e?.message}),
    onFinally: () => event$.emit({type: MessageType.RefreshUserConfig}),
  });
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });

  function onSubmit(data: z.infer<typeof FormSchema>) {
    let readMail = (data?.readMail ?? []).map(e => e.value) as string[];
    let sentMail = (data?.sentMail ?? []).map(e => e.value) as string[];
    $addUserConfig.run({...data, readMail, sentMail});
  }

  return <Dialog>
    <DialogTrigger asChild>
      <Button>Add</Button>
    </DialogTrigger>
    <DialogContent className="sm:max-w-[425px]">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Add</DialogTitle>
            <DialogDescription>
              Add a account. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className={'flex gap-2 flex-col'}>
            <FormField
              control={form.control}
              name="email"
              render={({field}) => <FormItem>
                <FormControl>
                  <Input type="email" placeholder="Email Account" value={field.value}
                         onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>} />
            <FormField
              control={form.control}
              name="readMail"
              render={({field}) => <FormItem>
                <FormControl>
                  <MultipleSelector placeholder="Read Mail List" creatable value={field.value}
                                    onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>} />
            <FormField
              control={form.control}
              name="sentMail"
              render={({field}) => <FormItem>
                <FormControl>
                  <MultipleSelector placeholder="Sent Mail List" creatable value={field.value}
                                    onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>} />
          </div>
          <DialogFooter className='pt-4'>
            <Button type="submit" disabled={$addUserConfig.loading}>
              {$addUserConfig.loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <></>}
              Submit
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  </Dialog>
}
