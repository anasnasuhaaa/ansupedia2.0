import type { APIRoute } from 'astro';
import { getAuth } from '../../../lib/auth/server';
export const ALL: APIRoute = async ({ request, clientAddress }) => {
  // Only expose the small set of account endpoints needed by this single-admin CMS.
  const action = new URL(request.url).pathname.replace('/api/auth/', '');
  if (!['sign-in/email', 'sign-out', 'get-session'].includes(action))
    return new Response('Not found', { status: 404 });
  try {
    const headers = new Headers(request.headers);
    headers.set('x-ansupedia-client-ip', clientAddress);
    return await getAuth().handler(new Request(request, { headers }));
  } catch {
    console.error('Authentication unavailable; check server configuration.');
    return Response.json(
      { message: 'Authentication unavailable. Check server configuration.' },
      { status: 503 },
    );
  }
};
