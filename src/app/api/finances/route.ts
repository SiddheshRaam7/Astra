import { z } from 'zod';
import { identity, checkOrigin } from '@/lib/server/auth';
import { readState, mutateState } from '@/lib/server/store';
import { actionSchema, applyAction } from '@/lib/model';
import { errorResponse } from '@/lib/server/http';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const user = await identity();
    return Response.json(
      {
        state: await readState(user.id),
        demo: user.demo,
        storage: process.env.DATABASE_URL ? 'PostgreSQL' : 'Local demo file',
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const user = await identity();
    const body = z
      .object({ version: z.number().int().nonnegative(), action: actionSchema })
      .parse(await req.json());
    const state = await mutateState(user.id, body.version, (s) => applyAction(s, body.action));
    return Response.json({ state });
  } catch (e) {
    return errorResponse(e);
  }
}
