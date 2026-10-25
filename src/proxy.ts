import { NextRequest, NextResponse } from 'next/server';
import { auth0, authConfigured, demoEnabled } from '@/lib/server/auth';
export async function proxy(request: NextRequest) {
  if (!authConfigured()) {
    if (request.nextUrl.pathname.startsWith('/auth/'))
      return NextResponse.json(
        {
          error:
            'Auth0 credentials are not configured. Configure the server environment to enable login.',
        },
        { status: 503 },
      );
    return NextResponse.next();
  }
  const response = await auth0().middleware(request);
  if (!demoEnabled() && !request.nextUrl.pathname.startsWith('/auth/')) {
    const session = await auth0().getSession(request);
    if (!session)
      return request.nextUrl.pathname.startsWith('/api/')
        ? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        : NextResponse.redirect(new URL('/auth/login', request.url));
  }
  return response;
}
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|[.]well-known/).*)',
  ],
};
