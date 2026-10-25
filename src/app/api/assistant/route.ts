import { z } from 'zod';
import { identity, checkOrigin } from '@/lib/server/auth';
import { mutateState, readState } from '@/lib/server/store';
import {
  executeReadOrPropose,
  previewAction,
  proposalToken,
  resolveIntent,
  verifyProposal,
} from '@/lib/server/assistant';
import { applyAction } from '@/lib/model';
import { errorResponse } from '@/lib/server/http';
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const user = await identity();
    const body = z
      .object({
        message: z.string().trim().min(1).max(2000).optional(),
        confirmation: z.string().max(10000).optional(),
      })
      .refine((v) => Boolean(v.message) !== Boolean(v.confirmation))
      .parse(await req.json());
    if (body.confirmation) {
      const p = verifyProposal(body.confirmation, user.id);
      const state = await mutateState(user.id, p.version, (s) => applyAction(s, p.action), {
        tool: p.action.type,
        action: p.action,
        confirmed: true,
      });
      return Response.json({
        state,
        reply:
          'Saved successfully. Your dashboard and cash flow now reflect the confirmed plan. No financial transfer was made.',
        provider: 'FORK · confirmed backend action',
      });
    }
    const state = await readState(user.id);
    const { intent, provider } = await resolveIntent(body.message!, state);
    const result = executeReadOrPropose(intent, state);
    return Response.json({
      ...result,
      provider,
      tool: intent.tool,
      ...(result.action
        ? {
            proposal: {
              token: proposalToken(user.id, state.version, result.action),
              preview: previewAction(state, result.action),
              action: result.action,
            },
          }
        : {}),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
