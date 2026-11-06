import 'dotenv/config';
import { it, expect, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import { getDb } from '../src/db/client';
import { posts, categories, postCategories } from '../src/db/schema';
import { savePost, getPost, deletePost, listPosts } from '../src/db/queries/blog';
import { databaseConfigured } from '../src/lib/env';
const local =
  databaseConfigured() &&
  ['localhost', '127.0.0.1', '[::1]'].includes(new URL(process.env.DATABASE_URL!).hostname);
const prefix = `test-${randomUUID()}`;
const ids: string[] = [];
const cats: string[] = [];
afterAll(async () => {
  if (!local) return;
  const db = getDb();
  if (ids.length) await db.delete(posts).where(inArray(posts.id, ids));
  if (cats.length) await db.delete(categories).where(inArray(categories.id, cats));
});
it.skipIf(!local)(
  'persists many-to-many categories, enforces unique slugs, hides drafts, publishes, edits and deletes',
  async () => {
    const db = getDb();
    const created = await db
      .insert(categories)
      .values([
        { name: prefix + ' A', slug: prefix + '-a' },
        { name: prefix + ' B', slug: prefix + '-b' },
      ])
      .returning();
    cats.push(...created.map((c) => c.id));
    const input = {
      title: prefix,
      slug: prefix,
      excerpt: 'Integration fixture',
      contentJson: { type: 'doc', content: [{ type: 'paragraph' }] },
      coverImageUrl: '',
      coverImageAlt: '',
      status: 'draft' as const,
      isFeatured: false,
      seoTitle: '',
      seoDescription: '',
      categoryIds: cats,
    };
    const post = await savePost(input);
    ids.push(post.id);
    expect(await getPost(post.slug)).toBeNull();
    expect((await getPost(post.id, true))?.categories).toHaveLength(2);
    await expect(savePost(input)).rejects.toThrow();
    await savePost({ ...input, status: 'published' }, post.id);
    expect((await getPost(post.slug))?.title).toBe(prefix);
    expect((await listPosts({ q: prefix, category: created[0].slug })).total).toBe(1);
    await savePost(
      { ...input, status: 'published', categoryIds: [cats[0]], title: 'Edited ' + prefix },
      post.id,
    );
    expect((await getPost(post.slug))?.categories).toHaveLength(1);
    await db.delete(categories).where(eq(categories.id, cats[0]));
    expect((await getPost(post.slug))?.categories).toHaveLength(0);
    await savePost({ ...input, categoryIds: [], status: 'draft' }, post.id);
    expect(await getPost(post.slug)).toBeNull();
    await deletePost(post.id);
    expect(await getPost(post.id, true)).toBeNull();
    expect(
      await db.select().from(postCategories).where(eq(postCategories.postId, post.id)),
    ).toHaveLength(0);
  },
);
