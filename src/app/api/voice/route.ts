import { checkOrigin, identity } from '@/lib/server/auth';
import { errorResponse } from '@/lib/server/http';
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    await identity();
    if (!process.env.ELEVENLABS_API_KEY || !process.env.ELEVENLABS_AGENT_ID)
      throw new Error(
        'ElevenLabs is not configured. Use the text assistant, or configure ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID.',
      );
    const url = new URL('https://api.elevenlabs.io/v1/convai/conversation/get-signed-url');
    url.searchParams.set('agent_id', process.env.ELEVENLABS_AGENT_ID);
    const result = await fetch(url, {
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY },
      signal: AbortSignal.timeout(15000),
      cache: 'no-store',
    });
    if (!result.ok)
      throw new Error('ElevenLabs could not start a session. Check your agent configuration.');
    const body = await result.json();
    return Response.json(
      { signedUrl: body.signed_url },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
