import type { APIRoute } from 'astro';
import { feedPosts, siteUrl, xml } from '../lib/blog/feeds';
export const GET: APIRoute = async () => {
  const posts = await feedPosts();
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Ansupedia — Writing</title><link>${xml(siteUrl())}</link><description>Software, security, and learning by building.</description><language>en</language>${posts.map((p) => `<item><title>${xml(p.title)}</title><link>${xml(new URL(`/blog/${p.slug}`, siteUrl()).href)}</link><guid>${xml(new URL(`/blog/${p.slug}`, siteUrl()).href)}</guid><description>${xml(p.excerpt)}</description><pubDate>${p.publishedAt!.toUTCString()}</pubDate></item>`).join('')}</channel></rss>`,
    { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } },
  );
};
