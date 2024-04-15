// import {ContextKit} from "@hocgin/nextjs-kit";

// export default ContextKit.withAuth([]);


import {NextRequest, NextResponse} from "next/server";
import {EmailMessage} from "cloudflare:email";

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  return response
}
