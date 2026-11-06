import type { APIRoute } from 'astro';
import { feedPosts, siteUrl, xml } from '../lib/blog/feeds';
export const GET: APIRoute = async () => {
  const posts = await feedPosts();
  const urls = [
    { path: '/', date: null },
    { path: '/blog', date: null },
    ...posts.map((p) => ({ path: `/blog/${p.slug}`, date: p.updatedAt })),
  ];
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>${xml(new URL(u.path, siteUrl()).href)}</loc>${u.date ? `<lastmod>${u.date.toISOString()}</lastmod>` : ''}</url>`).join('')}</urlset>`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
};
