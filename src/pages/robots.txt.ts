import type { APIRoute } from 'astro';
import { siteUrl } from '../lib/blog/feeds';
export const GET: APIRoute = () =>
  new Response(
    `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api\nSitemap: ${new URL('/sitemap.xml', siteUrl()).href}\n`,
    { headers: { 'Content-Type': 'text/plain' } },
  );
