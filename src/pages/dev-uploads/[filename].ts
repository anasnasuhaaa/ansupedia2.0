import type { APIRoute } from 'astro';
import { localUploadDirectory, localUploadName } from '../../lib/uploads/storage';

// Development assets are intentionally unreachable in production, even if files exist.
export const GET: APIRoute = async ({ params }) => {
  if (!import.meta.env.DEV || !params.filename || !localUploadName.test(params.filename))
    return new Response(null, { status: 404 });
  try {
    const { readFile } = await import('node:fs/promises');
    const bytes = await readFile(new URL(params.filename, localUploadDirectory));
    const type = params.filename.split('.').pop();
    return new Response(bytes, {
      headers: {
        'Content-Type': `image/${type}`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store',
        'Content-Security-Policy': "default-src 'none'; sandbox",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
};
