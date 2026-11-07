import { ZodError } from 'zod';
export async function readLimitedBody(
  request: Request,
  limit: number,
): Promise<Uint8Array<ArrayBuffer>> {
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new Error('Request is too large.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}
export async function readJson(request: Request) {
  return JSON.parse(new TextDecoder().decode(await readLimitedBody(request, 600_000)));
}
export function apiError(error: unknown): Response {
  if (error instanceof ZodError)
    return Response.json(
      {
        error: 'Please check the highlighted fields.',
        fieldErrors: Object.fromEntries(
          error.issues.map((issue) => [String(issue.path[0] || 'contentJson'), issue.message]),
        ),
      },
      { status: 400 },
    );
  const e = error as { code?: string; cause?: { code?: string }; message?: string };
  if (e.code === '23505' || e.cause?.code === '23505')
    return Response.json(
      {
        error: 'This slug is already in use. Choose another.',
        fieldErrors: { slug: 'This slug is already in use. Choose another.' },
      },
      { status: 409 },
    );
  if (e.code === '23503' || e.cause?.code === '23503')
    return Response.json({ error: 'A selected record no longer exists.' }, { status: 409 });
  console.error('CMS request failed', {
    name: error instanceof Error ? error.name : 'unknown',
    code: e.code || e.cause?.code,
  });
  return Response.json(
    { error: 'Unable to complete this request. Check your input or try again.' },
    { status: 400 },
  );
}
