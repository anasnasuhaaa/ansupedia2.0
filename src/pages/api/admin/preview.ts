import type { APIRoute } from 'astro';
import { readingTime, renderContent } from '../../../lib/blog/content';
import { apiError, readJson } from '../../../lib/api';
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await readJson(request);
    const html = renderContent(body.contentJson);
    return Response.json({ html, minutes: readingTime(body.contentJson) });
  } catch (e) {
    return apiError(e);
  }
};
