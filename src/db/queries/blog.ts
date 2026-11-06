import { and, desc, eq, ilike, inArray, lte, sql, count } from 'drizzle-orm';
import { getDb } from '../client';
import { posts, categories, postCategories } from '../schema';
import { databaseConfigured } from '../../lib/env';
import type { PostInput } from '../../lib/validation/post';
export const published = () =>
  and(eq(posts.status, 'published'), lte(posts.publishedAt, new Date()));
export async function listCategories() {
  return databaseConfigured() ? getDb().select().from(categories).orderBy(categories.name) : [];
}
export async function listCategoryStats() {
  if (!databaseConfigured()) return [];
  return getDb()
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      articleCount: count(postCategories.postId),
    })
    .from(categories)
    .leftJoin(postCategories, eq(categories.id, postCategories.categoryId))
    .groupBy(categories.id)
    .orderBy(categories.name);
}
// Hydrate category badges in one query per page, using the existing junction table.
async function withCategories<T extends { id: string }>(items: T[]) {
  if (!items.length)
    return [] as (T & { categories: { id: string; name: string; slug: string }[] })[];
  const links = await getDb()
    .select({
      postId: postCategories.postId,
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
    })
    .from(postCategories)
    .innerJoin(categories, eq(categories.id, postCategories.categoryId))
    .where(
      inArray(
        postCategories.postId,
        items.map((item) => item.id),
      ),
    )
    .orderBy(categories.name);
  return items.map((item) => ({
    ...item,
    categories: links
      .filter((link) => link.postId === item.id)
      .map(({ id, name, slug }) => ({ id, name, slug })),
  }));
}
export async function listPosts(
  options: {
    q?: string;
    category?: string;
    page?: number;
    admin?: boolean;
    status?: 'draft' | 'published';
    limit?: number;
  } = {},
) {
  const limit = options.limit || 9;
  const page = Number.isFinite(options.page)
    ? Math.min(10000, Math.max(1, Math.floor(options.page || 1)))
    : 1;
  if (!databaseConfigured()) return { items: [], total: 0, page, pages: 1 };
  const where = and(
    options.admin ? undefined : published(),
    options.q ? ilike(posts.title, `%${options.q.replace(/[\\%_]/g, '\\$&')}%`) : undefined,
    options.status ? eq(posts.status, options.status) : undefined,
    options.category
      ? inArray(
          posts.id,
          getDb()
            .select({ id: postCategories.postId })
            .from(postCategories)
            .innerJoin(categories, eq(postCategories.categoryId, categories.id))
            .where(eq(categories.slug, options.category)),
        )
      : undefined,
  );
  const [items, totals] = await Promise.all([
    getDb()
      .select()
      .from(posts)
      .where(where)
      .orderBy(desc(posts.publishedAt), desc(posts.updatedAt))
      .limit(limit)
      .offset((page - 1) * limit),
    getDb().select({ value: count() }).from(posts).where(where),
  ]);
  return {
    items: await withCategories(items),
    total: totals[0].value,
    page,
    pages: Math.max(1, Math.ceil(totals[0].value / limit)),
  };
}
export async function getPost(value: string, admin = false) {
  if (!databaseConfigured()) return null;
  const [post] = await getDb()
    .select()
    .from(posts)
    .where(
      and(admin ? eq(posts.id, value) : eq(posts.slug, value), admin ? undefined : published()),
    )
    .limit(1);
  if (!post) return null;
  const tags = await getDb()
    .select({ id: categories.id, name: categories.name, slug: categories.slug })
    .from(categories)
    .innerJoin(postCategories, eq(categories.id, postCategories.categoryId))
    .where(eq(postCategories.postId, post.id));
  return { ...post, categories: tags };
}
export async function savePost(input: PostInput, id?: string) {
  return getDb().transaction(async (tx) => {
    const { categoryIds, ...fields } = input;
    if (categoryIds.length) {
      const found = await tx
        .select({ id: categories.id })
        .from(categories)
        .where(inArray(categories.id, categoryIds));
      if (found.length !== categoryIds.length)
        throw new Error('One or more categories no longer exist.');
    }
    const [existing] = id ? await tx.select().from(posts).where(eq(posts.id, id)) : [];
    if (id && !existing) throw new Error('Article not found.');
    const values = {
      ...fields,
      updatedAt: new Date(),
      publishedAt:
        fields.status === 'published'
          ? existing?.publishedAt || new Date()
          : (existing?.publishedAt ?? null),
    };
    const [saved] = id
      ? await tx.update(posts).set(values).where(eq(posts.id, id)).returning()
      : await tx.insert(posts).values(values).returning();
    await tx.delete(postCategories).where(eq(postCategories.postId, saved.id));
    if (categoryIds.length)
      await tx
        .insert(postCategories)
        .values(categoryIds.map((categoryId) => ({ postId: saved.id, categoryId })));
    return saved;
  });
}
export async function deletePost(id: string) {
  return getDb().delete(posts).where(eq(posts.id, id)).returning({ id: posts.id });
}
export async function relatedPosts(id: string, categoryIds: string[]) {
  if (!categoryIds.length) return [];
  const items = await getDb()
    .select()
    .from(posts)
    .where(
      and(
        published(),
        sql`${posts.id} <> ${id}`,
        inArray(
          posts.id,
          getDb()
            .select({ id: postCategories.postId })
            .from(postCategories)
            .where(inArray(postCategories.categoryId, categoryIds)),
        ),
      ),
    )
    .orderBy(desc(posts.publishedAt))
    .limit(3);
  return withCategories(items);
}
export async function featuredPost() {
  if (!databaseConfigured()) return null;
  const items = await getDb()
    .select()
    .from(posts)
    .where(and(published(), eq(posts.isFeatured, true)))
    .orderBy(desc(posts.publishedAt))
    .limit(1);
  return (await withCategories(items))[0] || null;
}
