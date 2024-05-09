import {Mail} from "@/components/mail/mail"
import Cookie from "js-cookie";

export default function Home() {
  let layoutMcKey = `react-resizable-panels:m-layout`;
  let layoutPcKey = `react-resizable-panels:pc-layout`;
  const layoutMc = Cookie.get(layoutMcKey);
  const layoutPc = Cookie.get(layoutPcKey);

  const defaultLayoutMc = layoutMc ? JSON.parse(layoutMc.value) : undefined
  const defaultLayoutPc = layoutPc ? JSON.parse(layoutPc.value) : undefined
  return <>
    <div className='h-full w-screen'>
      <Mail navCollapsedSize={4}
            defaultLayoutMc={defaultLayoutMc} defaultLayoutPc={defaultLayoutPc} layoutMcKey={layoutMcKey}
            layoutPcKey={layoutPcKey} />
    </div>
  </>
}
