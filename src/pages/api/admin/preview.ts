import type { APIRoute } from 'astro';
import { renderContent } from '../../../lib/blog/content';
import { apiError, readJson } from '../../../lib/api';
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await readJson(request);
    return Response.json({ html: renderContent(body.contentJson) });
  } catch (e) {
    return apiError(e);
  }
};
