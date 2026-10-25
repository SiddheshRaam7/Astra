import { cookies } from 'next/headers';
import { randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
import { Auth0Client } from '@auth0/nextjs-auth0/server';

export const authConfigured = () =>
  Boolean(
    process.env.AUTH0_DOMAIN &&
    process.env.AUTH0_CLIENT_ID &&
    process.env.AUTH0_CLIENT_SECRET &&
    process.env.AUTH0_SECRET,
  );
let client: Auth0Client | undefined;
export function auth0() {
  return (client ??= new Auth0Client());
}
// Keep synthetic-session signatures stable across development hot reloads and
// route bundles. Hosted/serverless instances must share SESSION_SECRET instead.
const runtime = globalThis as typeof globalThis & { forkLocalSecret?: string };
const localSecret = (runtime.forkLocalSecret ??= randomUUID() + randomUUID());
export function signingSecret() {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32)
    return process.env.SESSION_SECRET;
  if (process.env.VERCEL)
    throw new Error('Configure SESSION_SECRET (at least 32 characters) before deployment.');
  return process.env.AUTH0_SECRET || localSecret;
}
export function sign(value: string) {
  return createHmac('sha256', signingSecret()).update(value).digest('base64url');
}
export function signatureMatches(value: string, signature: string) {
  const expected = Buffer.from(sign(value));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
export function demoEnabled() {
  return process.env.DEMO_MODE !== 'false';
}

export async function identity() {
  if (authConfigured()) {
    const session = await auth0().getSession();
    if (session?.user.sub)
      return { id: session.user.sub, demo: false, name: session.user.name ?? 'Member' };
  }
  if (!demoEnabled()) {
    if (!authConfigured())
      throw new Error('Authentication is required but Auth0 is not configured.');
    throw new Error('Unauthorized');
  }
  const jar = await cookies();
  let token = jar.get('fork_demo')?.value;
  if (token) {
    const [id, signature] = token.split('.');
    if (id && /^[a-f0-9-]{36}$/.test(id) && signature && signatureMatches(id, signature))
      return { id: `demo:${id}`, demo: true, name: 'Alex' };
  }
  const id = randomUUID();
  token = `${id}.${sign(id)}`;
  jar.set('fork_demo', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return { id: `demo:${id}`, demo: true, name: 'Alex' };
}

export function checkOrigin(req: Request) {
  const origin = req.headers.get('origin');
  const requestUrl = new URL(req.url);
  const expected = process.env.APP_BASE_URL
    ? new URL(process.env.APP_BASE_URL).origin
    : `${requestUrl.protocol}//${req.headers.get('host') || requestUrl.host}`;
  if (!origin || origin !== expected) throw new Error('Forbidden origin');
}
