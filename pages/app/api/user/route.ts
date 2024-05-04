import {NextRequest} from 'next/server';
import {ContextKit, ResultKit} from '@hocgin/nextjs-kit'

export const runtime = 'edge'

const GET = ContextKit.withError(async (req: NextRequest) => {
  let session = await ContextKit.getSessionThrow(req);
  return ResultKit.success(session);
});

export {GET};
