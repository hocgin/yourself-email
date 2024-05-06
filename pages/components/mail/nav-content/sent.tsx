import {Input} from "@/components/ui/input";
import {ResizablePanel} from "@/components/ui/resizable";
import React, {useEffect, useEffect} from "react";
import {Button} from "@/components/ui/button";
import {Textarea} from "@/components/ui/textarea";
import {zodResolver} from "@hookform/resolvers/zod"
import {useForm} from "react-hook-form"
import {z} from "zod"
import {Form, FormControl, FormField, FormItem, FormMessage} from "@/components/ui/form";
import {toast} from "@/components/ui/use-toast";
import {useBoolean, useRequest} from "ahooks";
import {AppService} from "@/service/http/app";
import {IMail, Mail} from "@/types/http";
import {Loader2, CircleX} from "lucide-react";
import MultipleSelector from "@/components/ui-expansions/multiple-selector";

const FormSchema = z.object({
  to: z.array(z.any()),
  from: z.string().email(),
  subject: z.string().min(1, {
    message: "Bio must be at least 1 characters.",
  }).max(50, {
    message: "Bio must not be longer than 50 characters.",
  }),
  cc: z.array(z.any()).optional(),
  bcc: z.array(z.any()).optional(),
  html: z.string(),
});


type Created = {
  defaultLayout: number[];
  selectedOwner?: IMail
};
export const SentContent: React.FC<Created> = ({selectedOwner, defaultLayout}) => {
  let [openCc, {toggle: toggleOpenCc}] = useBoolean(false);
  let [openBcc, {toggle: toggleOpenBcc}] = useBoolean(false);
  let sendMail = useRequest(({to, from, cc, bcc, subject, html}) => {
    let asMail = (list: any[]) => (list ?? []).map(e => ({address: e.value} as any));
    return AppService.sendMail({
      to: asMail(to),
      cc: asMail(cc),
      bcc: asMail(bcc),
      from: {address: from},
      subject,
      html
    });
  }, {
    manual: true,
    onSuccess: (_) => toast({title: `Success`}),
    onError: (e) => toast({variant: "destructive", title: e?.name, description: e?.message}),
  });

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      from: selectedOwner?.address === '*' ? undefined : selectedOwner?.address,
    }
  });
  useEffect(() => {
    form.setValue('from', (selectedOwner?.address === '*' ? undefined : selectedOwner?.address))
  }, [selectedOwner?.address]);


  function onSubmit(data: z.infer<typeof FormSchema>) {
    sendMail.run(data);
  }

  return <ResizablePanel defaultSize={100 - defaultLayout[0]} minSize={30}>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-2/3 space-y-2 mx-auto my-10">
        <FormField
          control={form.control}
          name="from"
          render={({field}) => <FormItem>
            <FormControl>
              <div className="flex w-full items-center">
                <Input type='email' placeholder="Sender" value={field.value}
                       disabled={selectedOwner?.address !== '*'}
                       onChange={field.onChange} />
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>} />
        <FormField
          control={form.control}
          name="to"
          render={({field}) => <FormItem>
            <FormControl>
              <div className="flex w-full items-center">
                <MultipleSelector placeholder="Recipient" creatable value={field.value}
                                  onChange={field.onChange} />
                {/*<Input type="email" placeholder="收件人" {...field} />*/}
                <Button type='button' variant="link" size='sm' onClick={toggleOpenCc}>CC</Button>
                <Button type='button' variant="link" size='sm' onClick={toggleOpenBcc}>BCC</Button>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>} />
        {openCc ? <FormField
          control={form.control}
          name="cc"
          render={({field}) => <FormItem>
            <FormControl>
              <div className="flex w-full items-center">
                <MultipleSelector placeholder="cc" creatable value={field.value}
                                  onChange={field.onChange} />
                <Button type='button' variant="link" size='sm' onClick={toggleOpenCc}>
                  <CircleX className='mr-2 h-4 w-4 ' />
                </Button>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>} /> : null}
        {openBcc ? <FormField
          control={form.control}
          name="bcc"
          render={({field}) => <FormItem>
            <FormControl>
              <div className="flex w-full items-center">
                <MultipleSelector placeholder="bcc" creatable value={field.value}
                                  onChange={field.onChange} />
                <Button type='button' variant="link" size='sm' onClick={toggleOpenBcc}>
                  <CircleX className='mr-2 h-4 w-4 ' />
                </Button>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>} /> : null}
        <FormField
          control={form.control}
          name="subject"
          render={({field}) => <FormItem>
            <FormControl>
              <Input type="text" placeholder="Subject" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>} />
        <FormField
          control={form.control}
          name="html"
          render={({field}) => (
            <FormItem>
              <FormControl>
                <Textarea placeholder="Content.." className='resize-vertical min-h-[300px]' {...field} />
              </FormControl>
              {/*<FormDescription>*/}
              {/*  You can <span>@mention</span> other users and organizations.*/}
              {/*</FormDescription>*/}
              <FormMessage />
            </FormItem>
          )} />
        <div className="flex items-center">
          <Button type="submit" size="sm" className="ml-auto">
            {sendMail.loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <></>}
            Send
          </Button>
        </div>
      </form>
    </Form>
  </ResizablePanel>
    ;
}
