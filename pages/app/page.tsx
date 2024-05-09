import {Mail} from "@/components/mail/mail"
import {cookies} from "next/headers";

export default function Home() {
  let layoutMcKey = `react-resizable-panels:m-layout`;
  let layoutPcKey = `react-resizable-panels:pc-layout`;
  let collapsedKey = "react-resizable-panels:collapsed";
  const layoutMc = cookies().get(layoutMcKey);
  const layoutPc = cookies().get(layoutPcKey);
  const collapsed = cookies().get(collapsedKey);

  const defaultLayoutMc = layoutMc ? JSON.parse(layoutMc.value) : undefined
  const defaultLayoutPc = layoutPc ? JSON.parse(layoutPc.value) : undefined
  const defaultCollapsed = collapsed ? JSON.parse(collapsed.value) : undefined
  return <>
    <div className='h-full w-screen'>
      <Mail navCollapsedSize={4} defaultCollapsed={defaultCollapsed} collapsedKey={collapsedKey}
            defaultLayoutMc={defaultLayoutMc} defaultLayoutPc={defaultLayoutPc} layoutMcKey={layoutMcKey}
            layoutPcKey={layoutPcKey} />
    </div>
  </>
}
