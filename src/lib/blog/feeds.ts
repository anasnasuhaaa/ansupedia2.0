import { getDb } from '../../db/client';
import { posts } from '../../db/schema';
import { published } from '../../db/queries/blog';
import { databaseConfigured, env } from '../env';
export const xml = (value: string) =>
  value.replace(
    /[<>&"']/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!,
  );
export const siteUrl = () => env('PUBLIC_SITE_URL') || 'http://localhost:4321';
export async function feedPosts() {
  return databaseConfigured()
    ? getDb()
        .select({
          title: posts.title,
          slug: posts.slug,
          excerpt: posts.excerpt,
          publishedAt: posts.publishedAt,
          updatedAt: posts.updatedAt,
        })
        .from(posts)
        .where(published())
    : [];
}
