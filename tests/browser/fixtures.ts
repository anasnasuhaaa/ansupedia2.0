import { test as base, expect, type APIRequestContext } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import { eq, like } from 'drizzle-orm';
import { getDb } from '../../src/db/client';
import { user, account, posts, categories } from '../../src/db/schema';
type EditorialFixture = {
  state: Awaited<ReturnType<APIRequestContext['storageState']>>;
  prefix: string;
  categories: { id: string; name: string; slug: string }[];
  posts: (typeof posts.$inferSelect)[];
};
export const localDatabase =
  !!process.env.DATABASE_URL &&
  ['localhost', '127.0.0.1', '[::1]'].includes(new URL(process.env.DATABASE_URL).hostname);
export const test = base.extend<{}, { editorial: EditorialFixture | null }>({
  editorial: [
    async ({ playwright }, use) => {
      if (!localDatabase) {
        await use(null);
        return;
      }
      const db = getDb();
      const id = randomUUID();
      const prefix = `browser-${id}`;
      const email = `${prefix}@example.invalid`;
      const password = randomUUID() + randomUUID();
      let client: APIRequestContext | undefined;
      try {
        const hash = await hashPassword(password);
        await db.transaction(async (tx) => {
          await tx.insert(user).values({
            id,
            email,
            name: 'Browser verification',
            role: 'admin',
            emailVerified: true,
          });
          await tx.insert(account).values({
            id: randomUUID(),
            accountId: id,
            providerId: 'credential',
            userId: id,
            password: hash,
          });
        });
        const createdCategories = await db
          .insert(categories)
          .values([
            { name: `Verification ${id.slice(0, 8)} A`, slug: `${prefix}-a` },
            { name: `Verification ${id.slice(0, 8)} B`, slug: `${prefix}-b` },
          ])
          .returning();
        // All fixtures are clearly identified and removed in finally; existing records are untouched.
        const createdPosts = await db
          .insert(posts)
          .values(
            Array.from({ length: 11 }, (_, index) => ({
              title: `${prefix} · Browser verification note ${index + 1}`,
              slug: `${prefix}-note-${index + 1}`,
              excerpt:
                'Temporary browser verification article. Removed automatically after the test run.',
              status: 'published' as const,
              isFeatured: index === 0,
              publishedAt: new Date(Date.now() - index * 60000),
              contentJson: {
                type: 'doc',
                content: [
                  {
                    type: 'heading',
                    attrs: { level: 2 },
                    content: [{ type: 'text', text: 'Learning through iteration' }],
                  },
                  {
                    type: 'paragraph',
                    content: [
                      {
                        type: 'text',
                        text: 'A temporary fixture for checking reading typography, categories, and responsive layout.',
                      },
                    ],
                  },
                  {
                    type: 'blockquote',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          { type: 'text', text: 'Small improvements make a thoughtful whole.' },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'codeBlock',
                    attrs: { language: 'typescript' },
                    content: [
                      { type: 'text', text: 'const learning = true;\nconsole.log(learning);' },
                    ],
                  },
                ],
              },
            })),
          )
          .returning();
        const { postCategories } = await import('../../src/db/schema');
        await db
          .insert(postCategories)
          .values(
            createdPosts.flatMap((post) =>
              createdCategories.map((category) => ({ postId: post.id, categoryId: category.id })),
            ),
          );
        client = await playwright.request.newContext({ baseURL: 'http://localhost:4321' });
        const signIn = () =>
          client!.post('/api/auth/sign-in/email', {
            headers: { Origin: 'http://localhost:4321' },
            data: { email, password },
          });
        let response = await signIn();
        if (response.status() === 429) {
          // A prior rate-limit test may have used this localhost IP. Respect its cooldown.
          const retryAfter = Math.max(
            1,
            Math.min(65, Number(response.headers()['retry-after']) || 60),
          );
          await new Promise((resolve) => setTimeout(resolve, (retryAfter + 1) * 1000));
          response = await signIn();
        }
        expect(response.status(), 'Temporary local administrator can sign in').toBe(200);
        await use({
          state: await client.storageState(),
          prefix,
          categories: createdCategories,
          posts: createdPosts,
        });
      } finally {
        await client?.dispose();
        await db.delete(posts).where(like(posts.slug, `${prefix}%`));
        await db.delete(categories).where(like(categories.slug, `${prefix}%`));
        await db.delete(user).where(eq(user.id, id));
      }
    },
    { scope: 'worker', timeout: 150000 },
  ],
});
export { expect };
