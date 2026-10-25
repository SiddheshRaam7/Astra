import { ZodError } from 'zod';
export function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : 'Request failed';
  const status =
    message === 'Unauthorized'
      ? 401
      : message.startsWith('Forbidden')
        ? 403
        : message.startsWith('Conflict')
          ? 409
          : error instanceof ZodError
            ? 400
            : /not configured|Configure|requires|credentials/i.test(message)
              ? 503
              : 400;
  if (process.env.NODE_ENV !== 'test')
    console.error(
      '[FORK request]',
      error instanceof ZodError
        ? 'Validation failed'
        : message.replace(/postgres(?:ql)?:\/\/\S+/gi, '[redacted]'),
    );
  return Response.json(
    {
      error:
        error instanceof ZodError
          ? 'Invalid input. Check amounts, dates and required fields.'
          : status === 400 && /password|connect|SQL|relation|database/i.test(message)
            ? 'Storage request failed. Check server configuration.'
            : message,
    },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
}
