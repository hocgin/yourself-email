import {Input} from "@/components/ui/input";
import {ResizablePanel} from "@/components/ui/resizable";
import React from "react";
import {Button} from "@/components/ui/button";
import {Textarea} from "@/components/ui/textarea";
import {zodResolver} from "@hookform/resolvers/zod"
import {useForm} from "react-hook-form"
import {z} from "zod"
import {Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {toast} from "@/components/ui/use-toast";
import {useBoolean, useRequest} from "ahooks";
import {AppService} from "@/service/http/app";
import {IMail, Mail} from "@/types/http";
import {Loader2, CircleX} from "lucide-react";
import MultipleSelector from "@/components/ui-expansions/multiple-selector";

const FormSchema = z.object({
  to: z.array(z.any()),
  subject: z.string().min(1, {
    message: "Bio must be at least 1 characters.",
  }).max(50, {
    message: "Bio must not be longer than 50 characters.",
  }),
  cc: z.array(z.any()).optional(),
  bcc: z.array(z.any()).optional(),
  html: z.string(),
})


type Created = {
  defaultLayout: number[];
  selectedOwner?: IMail
};
export const NewMail: React.FC<Created> = ({selectedOwner, defaultLayout}) => {
  let [openCc, {toggle: toggleOpenCc}] = useBoolean(false);
  let [openBcc, {toggle: toggleOpenBcc}] = useBoolean(false);
  let sendMail = useRequest(({to, cc, bcc, subject, html}) => {
    let asMail = (list: any[]) => (list ?? []).map(e => ({address: e.value} as any));
    return AppService.sendMail({
      to: asMail(to),
      cc: asMail(cc),
      bcc: asMail(bcc),
      from: selectedOwner, subject, html
    });
  }, {
    manual: true,
    onSuccess: (_) => toast({title: `发送成功`}),
    onError: (e) => toast({variant: "destructive", title: e?.name, description: e?.message}),
  });

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });

  function onSubmit(data: z.infer<typeof FormSchema>) {
    sendMail.runAsync(data);
  }

  return <ResizablePanel defaultSize={100 - defaultLayout[0]} minSize={30}>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-2/3 space-y-2 mx-auto my-10">
        <FormField
          control={form.control}
          name="to"
          render={({field}) => <FormItem>
            <FormControl>
              <div className="flex w-full items-center">
                <MultipleSelector placeholder="收件人" creatable value={field.value}
                                  onChange={field.onChange} />
                {/*<Input type="email" placeholder="收件人" {...field} />*/}
                <Button type='button' variant="link" size='sm' onClick={toggleOpenCc}>抄送</Button>
                <Button type='button' variant="link" size='sm' onClick={toggleOpenBcc}>密送</Button>
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
                <MultipleSelector placeholder="抄送" creatable value={field.value}
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
                <MultipleSelector placeholder="密送" creatable value={field.value}
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
              <Input type="text" placeholder="主题" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>} />
        <FormField
          control={form.control}
          name="html"
          render={({field}) => (
            <FormItem>
              <FormControl>
                <Textarea placeholder="正文.." className='resize-vertical min-h-[300px]' {...field} />
              </FormControl>
              {/*<FormDescription>*/}
              {/*  You can <span>@mention</span> other users and organizations.*/}
              {/*</FormDescription>*/}
              <FormMessage />
            </FormItem>
          )} />
        <Button type="submit">
          {sendMail.loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <></>}
          Submit
        </Button>
      </form>
    </Form>
  </ResizablePanel>;
}
