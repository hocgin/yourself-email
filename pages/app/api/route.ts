import {NextRequest, NextResponse} from 'next/server';
import Email from 'vercel-email';

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  let payload = (await request.json()) as any;
  try {
    await Email.send(payload);
    return NextResponse.json({success: true});
  } catch (e) {
    return NextResponse.json({success: false, message: e.message})
  }
}
