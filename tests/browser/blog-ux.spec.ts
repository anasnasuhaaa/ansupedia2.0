import { test as base, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { randomUUID } from 'node:crypto';
import { inArray } from 'drizzle-orm';
import { getDb } from '../../src/db/client';
import { posts, categories, postCategories } from '../../src/db/schema';
import { localDatabase } from './fixtures';

const readingContent = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: 'A practical notebook' }],
    },
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Reading and building' }],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'A temporary reading fixture with meaningful text, readable paragraphs, and links.',
        },
      ],
    },
    { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Small details' }] },
    {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'Keep the interface simple.' }] },
          ],
        },
      ],
    },
    {
      type: 'orderedList',
      content: [
        {
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Verify the result.' }] }],
        },
      ],
    },
    {
      type: 'blockquote',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Clarity comes from careful editing.' }],
        },
      ],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Astro documentation',
          marks: [{ type: 'link', attrs: { href: 'https://docs.astro.build' } }],
        },
      ],
    },
    {
      type: 'codeBlock',
      attrs: { language: 'typescript' },
      content: [{ type: 'text', text: 'const example = "' + 'a'.repeat(180) + '";' }],
    },
    {
      type: 'image',
      attrs: {
        src: 'https://example.invalid/reading-fixture.png',
        alt: 'Temporary article illustration',
        width: 800,
        height: 500,
      },
    },
  ],
};
type BlogFixture = {
  prefix: string;
  categories: (typeof categories.$inferSelect)[];
  posts: (typeof posts.$inferSelect)[];
};
const test = base.extend<{}, { blog: BlogFixture | null }>({
  blog: [
    async ({}, use) => {
      if (!localDatabase) {
        await use(null);
        return;
      }
      const db = getDb(),
        prefix = `blog-ux-${randomUUID()}`,
        postIds: string[] = [],
        categoryIds: string[] = [];
      try {
        const names = [
          'Cybersecurity',
          'Software Engineering',
          'Web Development',
          'CTF',
          'Learning Notes',
        ];
        const createdCategories = await db
          .insert(categories)
          .values([
            ...names.map((name, index) => ({
              name: `${name} ${prefix.slice(-8)}`,
              slug: `${prefix}-${index}`,
            })),
            { name: prefix.slice(-8) + 'A'.repeat(72), slug: `${prefix}-long` },
          ])
          .returning();
        categoryIds.push(...createdCategories.map((c) => c.id));
        const createdPosts = await db
          .insert(posts)
          .values(
            Array.from({ length: 14 }, (_, index) => ({
              title: `${prefix} ${[1, 7, 10].includes(index) ? 'Astro' : 'Note'} ${index}`,
              slug: `${prefix}-${index}`,
              excerpt:
                'Temporary article for verifying categories and a comfortable reading layout.',
              status: index === 12 ? ('draft' as const) : ('published' as const),
              publishedAt: new Date(Date.now() + (index === 13 ? 86400000 : -index * 1000)),
              isFeatured: index === 0,
              coverImageUrl: index === 10 ? '/images/projects/hydro-gig.png' : null,
              coverImageAlt: index === 10 ? 'Temporary article cover' : null,
              contentJson: readingContent,
            })),
          )
          .returning();
        postIds.push(...createdPosts.map((p) => p.id));
        await db
          .insert(postCategories)
          .values(
            createdPosts.flatMap((post, index) =>
              index === 11
                ? []
                : (index < 5
                    ? [createdCategories[0]]
                    : index < 10
                      ? [createdCategories[1]]
                      : createdCategories.slice(0, 2)
                  ).map((category) => ({ postId: post.id, categoryId: category.id })),
            ),
          );
        await use({ prefix, categories: createdCategories, posts: createdPosts });
      } finally {
        if (postIds.length) await db.delete(posts).where(inArray(posts.id, postIds));
        if (categoryIds.length)
          await db.delete(categories).where(inArray(categories.id, categoryIds));
      }
    },
    { scope: 'worker' },
  ],
});
test.beforeEach(({ blog }) =>
  test.skip(!blog, 'Requires the documented localhost PostgreSQL fixture.'),
);

const selectedSlugs = (page: Page) => new URL(page.url()).searchParams.getAll('category');
const cards = (page: Page) => page.locator('.blog-page .post-card h2 a');
const categoryNav = (page: Page) => page.getByRole('navigation', { name: 'Article categories' });
async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() =>
    Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => {}))),
  );
}

test('category toggles preserve OR results, search, pagination, refresh and browser history', async ({
  page,
  blog,
}) => {
  const fixture = blog!,
    [a, b] = fixture.categories;
  const buttonA = categoryNav(page).getByRole('button', { name: a.name, exact: true });
  const buttonB = categoryNav(page).getByRole('button', { name: b.name, exact: true });
  const all = categoryNav(page).getByRole('button', { name: 'All Articles', exact: true });
  await page.goto(`/blog?q=${fixture.prefix}`);
  await expect(all).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.writing-heading .meta')).toContainText('12 articles');
  await buttonA.focus();
  await page.keyboard.press('Space');
  await expect(buttonA).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.writing-heading .meta')).toContainText('6 articles');
  await buttonB.click();
  expect(selectedSlugs(page)).toEqual([a.slug, b.slug]);
  await expect(all).toHaveAttribute('aria-pressed', 'false');
  await expect(buttonA.locator('.category-check')).toBeVisible();
  await expect(buttonB.locator('.category-check')).toBeVisible();
  await expect(page.locator('.writing-heading .meta')).toContainText('11 articles');
  const firstPage = await cards(page).evaluateAll((elements) =>
    elements.map((el) => el.getAttribute('href')),
  );
  expect(firstPage).toHaveLength(9);
  await page.goBack();
  expect(selectedSlugs(page)).toEqual([a.slug]);
  await page.goForward();
  expect(selectedSlugs(page)).toEqual([a.slug, b.slug]);
  await page.getByRole('link', { name: 'Next page', exact: true }).click();
  expect(selectedSlugs(page)).toEqual([a.slug, b.slug]);
  const secondPage = await cards(page).evaluateAll((elements) =>
    elements.map((el) => el.getAttribute('href')),
  );
  expect(secondPage).toHaveLength(2);
  expect(new Set([...firstPage, ...secondPage]).size).toBe(11);
  const union = [...firstPage, ...secondPage];
  for (const index of [0, 5, 10]) expect(union).toContain(`/blog/${fixture.posts[index].slug}`);
  for (const index of [11, 12, 13])
    expect(union).not.toContain(`/blog/${fixture.posts[index].slug}`);
  await page.getByRole('link', { name: 'Previous page', exact: true }).click();
  await page.getByRole('link', { name: 'Next page', exact: true }).click();
  await page.reload();
  await expect(buttonA).toHaveAttribute('aria-pressed', 'true');
  await expect(buttonB).toHaveAttribute('aria-pressed', 'true');
  await buttonA.click();
  expect(selectedSlugs(page)).toEqual([b.slug]);
  expect(new URL(page.url()).searchParams.has('page')).toBe(false);
  await expect(page.locator('.writing-heading .meta')).toContainText('6 articles');
  await buttonA.click();
  await page.getByRole('searchbox', { name: 'Search articles' }).fill(`${fixture.prefix} Astro`);
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  expect(selectedSlugs(page)).toEqual([b.slug, a.slug]);
  await expect(cards(page)).toHaveCount(3);
  await expect(page.locator('.writing-heading .meta')).toContainText('3 articles');
  await expect(page.locator('.featured-post')).toHaveCount(0);
  await all.click();
  expect(selectedSlugs(page)).toEqual([]);
  expect(new URL(page.url()).searchParams.get('q')).toBe(`${fixture.prefix} Astro`);
  await expect(all).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('link', { name: 'Clear filters', exact: true }).click();
  await expect(page).toHaveURL('/blog');
  await expect(page.locator('.featured-post')).toHaveCount(1);
  await expect(cards(page).filter({ hasText: fixture.posts[0].title })).toHaveCount(1);
});

test('legacy URLs, duplicate slugs and unknown input are safe; filters work without JavaScript', async ({
  page,
  browser,
  blog,
}) => {
  const fixture = blog!,
    [a, b] = fixture.categories;
  await page.goto(
    `/blog?q=${fixture.prefix}&category=${a.slug}&category=${a.slug}&category=unknown-category&category=%3Cscript%3E`,
  );
  await expect(
    categoryNav(page).getByRole('button', { name: a.name, exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.writing-heading .meta')).toContainText('6 articles');
  await categoryNav(page).getByRole('button', { name: b.name, exact: true }).click();
  expect(selectedSlugs(page)).toEqual([a.slug, b.slug]);
  await page.goto(`/blog?q=${fixture.prefix}&category=unknown-category`);
  await expect(
    categoryNav(page).getByRole('button', { name: 'All Articles', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.writing-heading .meta')).toContainText('12 articles');
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const native = await context.newPage();
    await native.goto(`http://localhost:4321/blog?q=${fixture.prefix}&category=${a.slug}`);
    await categoryNav(native).getByRole('button', { name: b.name, exact: true }).click();
    expect(selectedSlugs(native)).toEqual([a.slug, b.slug]);
    await expect(native.locator('.writing-heading .meta')).toContainText('11 articles');
  } finally {
    await context.close();
  }
});

for (const width of [320, 375, 390, 768, 1024, 1440]) {
  test(`blog filters and article reading wrap correctly at ${width}px in both themes`, async ({
    page,
    blog,
  }, testInfo) => {
    const fixture = blog!,
      [a, b] = fixture.categories;
    await page.setViewportSize({ width, height: 900 });
    await page.route('https://example.invalid/reading-fixture.png', (route) =>
      route.fulfill({ path: 'public/images/projects/hydro-gig.png', contentType: 'image/png' }),
    );
    for (const theme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: theme });
      await page.goto(`/blog?q=${fixture.prefix}&category=${a.slug}&category=${b.slug}`);
      await page.addStyleTag({ content: 'astro-dev-toolbar {display:none}' });
      await settle(page);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText("Ansupedia's Blog");
      for (const text of [
        'The notebook',
        'Learning in public.',
        'Subscribe via RSS',
        'Notes on software, security, and figuring things out.',
        'An open notebook from the process of building.',
      ])
        expect(await page.locator('main').innerText()).not.toContain(text);
      const layout = await page.locator('.category-filters').evaluate((el) => {
        const rect = el.getBoundingClientRect(),
          buttons = [...el.querySelectorAll('button')];
        return {
          wrap: getComputedStyle(el).flexWrap,
          overflow: el.scrollWidth > el.clientWidth,
          rows: new Set(buttons.map((button) => button.getBoundingClientRect().top)).size,
          fit: buttons.every(
            (button) =>
              button.getBoundingClientRect().right <= rect.right + 1 &&
              button.scrollWidth <= button.clientWidth + 1,
          ),
          targets: buttons.every((button) => button.getBoundingClientRect().height >= 40),
        };
      });
      expect(layout.wrap).toBe('wrap');
      expect(layout.overflow).toBe(false);
      expect(layout.fit).toBe(true);
      expect(layout.targets).toBe(true);
      if (width <= 768) expect(layout.rows).toBeGreaterThan(1);
      await expect(page.getByRole('searchbox', { name: 'Search articles' })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: testInfo.outputPath(`blog-${width}-${theme}.png`),
        fullPage: true,
      });
      await page.goto(`/blog/${fixture.posts[10].slug}`);
      await page.addStyleTag({ content: 'astro-dev-toolbar {display:none}' });
      await settle(page);
      const back = page.getByRole('link', { name: 'Back to blog', exact: true });
      await expect(back.locator('svg')).toBeVisible();
      const backRect = (await back.boundingBox())!,
        header = (await page.locator('.article-heading').boundingBox())!;
      expect(Math.abs(backRect.x - header.x)).toBeLessThan(1);
      expect(header.y - backRect.y - backRect.height).toBeGreaterThanOrEqual(23);
      await expect(page.locator('.article-heading .category-badge')).toHaveCount(2);
      for (const selector of [
        'h1',
        'h2',
        'h3',
        'ul',
        'ol',
        'blockquote',
        'pre code.hljs',
        'a',
        'img',
      ])
        await expect(page.locator(`.article-prose ${selector}`).first()).toBeVisible();
      await expect(page.locator('.article-prose img')).toHaveJSProperty('naturalWidth', 1440);
      const code = page.locator('.article-prose pre');
      await expect(code).toHaveAttribute('tabindex', '0');
      await code.focus();
      await code.press('ArrowRight');
      await expect.poll(() => code.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
      await expect(page.locator('.related-section')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.evaluate(() => {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        window.scrollTo({ top: 0, behavior: 'instant' });
      });
      await page.screenshot({
        path: testInfo.outputPath(`article-${width}-${theme}.png`),
        fullPage: true,
      });
      await back.click();
      await expect(page).toHaveURL('/blog');
    }
  });
}

test('blog filtering and article reading pass accessibility checks in both themes', async ({
  page,
  blog,
}) => {
  const fixture = blog!,
    [a, b] = fixture.categories;
  await page.setViewportSize({ width: 375, height: 900 });
  await page.route('https://example.invalid/reading-fixture.png', (route) =>
    route.fulfill({ path: 'public/images/projects/hydro-gig.png', contentType: 'image/png' }),
  );
  for (const theme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    for (const route of [
      `/blog?q=${fixture.prefix}&category=${a.slug}&category=${b.slug}`,
      `/blog/${fixture.posts[10].slug}`,
    ]) {
      await page.goto(route);
      await settle(page);
      expect(
        (
          await new AxeBuilder({ page })
            .exclude('astro-dev-toolbar')
            .withTags(['wcag2a', 'wcag2aa'])
            .analyze()
        ).violations,
      ).toEqual([]);
    }
  }
  expect((await page.request.get('/rss.xml')).status()).toBe(200);
});
