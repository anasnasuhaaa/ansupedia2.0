import 'dotenv/config';
import { it, expect, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import { getDb } from '../src/db/client';
import { posts, categories, postCategories } from '../src/db/schema';
import {
  savePost,
  getPost,
  deletePost,
  listPosts,
  listCategoryStats,
} from '../src/db/queries/blog';
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
    const listing = await listPosts({ q: prefix, category: created[0].slug });
    expect(listing.total).toBe(1);
    expect(listing.items[0].categories.map((category) => category.id).sort()).toEqual(
      [...cats].sort(),
    );
    const usage = await listCategoryStats();
    for (const categoryId of cats)
      expect(usage.find((category) => category.id === categoryId)?.articleCount).toBe(1);
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

it.skipIf(!local)(
  'filters category unions without duplicates and combines search, visibility and pagination',
  async () => {
    const db = getDb();
    const query = `${prefix}-multi`;
    const selected = await db
      .insert(categories)
      .values([
        { name: query + ' Security', slug: query + '-security' },
        { name: query + ' Software', slug: query + '-software' },
      ])
      .returning();
    cats.push(...selected.map((category) => category.id));
    const created = await db
      .insert(posts)
      .values(
        ['Astro security', 'Software only', 'Astro both', 'Uncategorized', 'Draft', 'Future'].map(
          (title, index) => ({
            title: `${query} ${title}`,
            slug: `${query}-${index}`,
            status: index === 4 ? ('draft' as const) : ('published' as const),
            publishedAt: new Date(Date.now() + (index === 5 ? 86400000 : -index * 1000)),
            contentJson: { type: 'doc', content: [{ type: 'paragraph' }] },
          }),
        ),
      )
      .returning();
    ids.push(...created.map((post) => post.id));
    await db.insert(postCategories).values([
      { postId: created[0].id, categoryId: selected[0].id },
      { postId: created[1].id, categoryId: selected[1].id },
      { postId: created[2].id, categoryId: selected[0].id },
      { postId: created[2].id, categoryId: selected[1].id },
      { postId: created[4].id, categoryId: selected[0].id },
      { postId: created[5].id, categoryId: selected[0].id },
    ]);
    const slugs = selected.map((category) => category.slug);
    const options = { q: query, category: slugs, limit: 2 };
    const first = await listPosts(options);
    const second = await listPosts({ ...options, page: 2 });
    expect(first.total).toBe(3);
    expect(first.pages).toBe(2);
    expect(first.items).toHaveLength(2);
    expect(second.items).toHaveLength(1);
    expect(new Set([...first.items, ...second.items].map((post) => post.id)).size).toBe(3);
    expect((await listPosts({ q: query, category: slugs[0] })).total).toBe(2);
    expect((await listPosts({ q: query, category: [slugs[0], slugs[0]] })).total).toBe(2);
    expect((await listPosts({ q: query + ' Astro', category: slugs })).total).toBe(2);
    expect((await listPosts({ q: query, category: [] })).total).toBe(4);
    expect((await listPosts({ q: query, category: ['unknown-category'] })).total).toBe(0);
    expect((await listPosts({ q: query, admin: true })).total).toBe(6);
    expect((await listPosts({ q: query, admin: true, status: 'draft' })).total).toBe(1);
  },
);
