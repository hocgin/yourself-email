import {NextRequest, NextResponse} from 'next/server';
import {getRequestContext} from '@cloudflare/next-on-pages';

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const {env, cf, ctx} = getRequestContext();
  let responseText = 'Hello World';
  const stmt = env.DB.prepare('SELECT * FROM mail');
  const {results} = await stmt.all();

  // In the edge runtime you can use Bindings that are available in your application
  // (for more details see:
  //    - https://developers.cloudflare.com/pages/framework-guides/deploy-a-nextjs-site/#use-bindings-in-your-nextjs-application
  //    - https://developers.cloudflare.com/pages/functions/bindings/
  // )
  //
  // KV Example:
  // const myKv = getRequestContext().env.MY_KV_NAMESPACE
  // await myKv.put('suffix', ' from a KV store!')
  // const suffix = await myKv.get('suffix')
  // responseText += suffix
  return NextResponse.json(results);
}
