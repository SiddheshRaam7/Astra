import { identity } from '@/lib/server/auth';
import { errorResponse } from '@/lib/server/http';
export async function GET() {
  try {
    await identity();
    return Response.json(
      {
        gemini: Boolean(process.env.GEMINI_API_KEY),
        elevenlabs: Boolean(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_AGENT_ID),
        database: Boolean(process.env.DATABASE_URL),
        auth0: Boolean(
          process.env.AUTH0_DOMAIN &&
          process.env.AUTH0_SECRET &&
          process.env.AUTH0_CLIENT_ID &&
          process.env.AUTH0_CLIENT_SECRET,
        ),
        plaid: Boolean(
          process.env.PLAID_CLIENT_ID &&
          process.env.PLAID_SECRET &&
          process.env.TOKEN_ENCRYPTION_KEY &&
          process.env.DATABASE_URL,
        ),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
