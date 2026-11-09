import { test, expect, localDatabase } from './fixtures';
import AxeBuilder from '@axe-core/playwright';
test.beforeEach(async ({ context, editorial }) => {
  test.skip(
    !localDatabase || !editorial,
    'Mutation tests require a configured localhost PostgreSQL database.',
  );
  await context.addCookies(editorial!.state.cookies);
});

test('blog categories, search and pagination preserve combined URL state', async ({
  page,
  editorial,
}, testInfo) => {
  const fixture = editorial!;
  const [first, second] = fixture.categories;
  await page.goto(`/blog?q=${fixture.prefix}`);
  await expect(page.locator('.post-card-wrap')).toHaveCount(9);
  await page
    .getByRole('navigation', { name: 'Article categories' })
    .getByRole('button', { name: first.name, exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`q=${fixture.prefix}.*category=${first.slug}`));
  await expect(
    page
      .getByRole('navigation', { name: 'Article categories' })
      .getByRole('button', { name: first.name, exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('link', { name: 'Next page', exact: true }).click();
  await expect(page.locator('.post-card-wrap')).toHaveCount(2);
  await expect(page).toHaveURL(/page=2/);
  await page
    .getByRole('navigation', { name: 'Article categories' })
    .getByRole('button', { name: second.name, exact: true })
    .click();
  await expect(page).not.toHaveURL(/page=/);
  expect(new URL(page.url()).searchParams.get('q')).toBe(fixture.prefix);
  await page.getByRole('searchbox', { name: 'Search articles' }).fill(fixture.posts[8].title);
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.locator('.post-card-wrap')).toHaveCount(1);
  expect(new URL(page.url()).searchParams.getAll('category')).toEqual([first.slug, second.slug]);
  await page.addStyleTag({ content: 'astro-dev-toolbar{display:none}' });
  await page.screenshot({ path: testInfo.outputPath('blog-filtered-desktop.png'), fullPage: true });
  await page.locator('.post-card h2 a').click();
  await expect(page.locator('.article-prose h2')).toContainText('Learning through iteration');
  await expect(page.locator('.article-prose .hljs')).toBeVisible();
  await expect(page.locator('.article-page .page-heading .category-badge')).toHaveCount(2);
  await page.screenshot({ path: testInfo.outputPath('article-desktop.png'), fullPage: true });
  for (const width of [1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.screenshot({ path: testInfo.outputPath('article-mobile.png'), fullPage: true });
  await page.locator('.article-page .page-heading .category-badge').first().click();
  await expect(page).toHaveURL(/\/blog\?category=/);
  await page.getByRole('link', { name: 'Clear filters', exact: true }).click();
  await expect(page).toHaveURL('/blog');
  await expect(page.locator('.featured-post')).toHaveCount(1);
  await expect(page.locator(`.post-card h2 a[href="/blog/${fixture.posts[0].slug}"]`)).toHaveCount(
    1,
  );
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});

test('admin dashboard and category manager dialogs work at desktop and mobile sizes', async ({
  page,
  editorial,
}, testInfo) => {
  const fixture = editorial!;
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Your writing, at a glance.' })).toBeVisible();
  await page.addStyleTag({ content: 'astro-dev-toolbar{display:none}' });
  await page.screenshot({ path: testInfo.outputPath('admin-desktop.png'), fullPage: true });
  await page
    .getByRole('navigation', { name: 'Administration', exact: true })
    .getByRole('link', { name: 'Categories', exact: true })
    .click();
  await page.getByRole('button', { name: 'New category', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Create a category' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Name', { exact: true }).fill(`${fixture.prefix} New`);
  await expect(dialog.getByLabel('Slug', { exact: true })).toHaveValue(`${fixture.prefix}-new`);
  await dialog.getByRole('button', { name: 'Create category', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('[data-sonner-toast]')).toContainText('Category created successfully.');
  await page.getByRole('searchbox', { name: 'Search categories' }).fill(`${fixture.prefix} New`);
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  const edit = page.getByRole('dialog', { name: 'Edit category' });
  await edit.getByLabel('Name', { exact: true }).fill(`${fixture.prefix} Renamed`);
  await edit.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(
    page.getByRole('cell', { name: `${fixture.prefix} Renamed`, exact: true }),
  ).toBeVisible();
  await expect(page.locator('[data-sonner-toast]')).toContainText('Category updated successfully.');
  await page
    .getByRole('button', { name: `Delete category: ${fixture.prefix} Renamed`, exact: true })
    .click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('alertdialog')).not.toBeVisible();
  await page
    .getByRole('button', { name: `Delete category: ${fixture.prefix} Renamed`, exact: true })
    .click();
  await page.getByRole('button', { name: 'Confirm deletion', exact: true }).click();
  await expect(
    page.getByRole('cell', { name: `${fixture.prefix} Renamed`, exact: true }),
  ).toHaveCount(0);
  await expect(page.locator('[data-sonner-toast]')).toContainText('Category deleted successfully.');
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.getByRole('button', { name: 'Workspace menu', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Your workspace', exact: true })).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Mobile administration', exact: true })
    .getByRole('link', { name: 'Articles', exact: true })
    .click();
  await expect(page).toHaveURL('/admin/posts');
  await expect(page.getByRole('dialog', { name: 'Your workspace', exact: true })).not.toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('admin-articles-mobile.png'), fullPage: true });
});

test('editor formatting, insertion dialogs and manual slugs preserve selection and semantics', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/admin/posts/new');
  const content = page.getByRole('textbox', { name: 'Article content', exact: true });
  await expect(content).toBeVisible();
  await expect(page.locator('.article-editor aside')).toHaveCount(0);
  expect(
    await page
      .locator('.editor-layout')
      .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length),
  ).toBe(1);
  await page.getByLabel('Title', { exact: true }).fill('A thoughtful article');
  await expect(page.getByLabel('URL slug')).toHaveValue('a-thoughtful-article');
  await page.getByLabel('URL slug').fill('my-custom-slug');
  await page.getByLabel('Title', { exact: true }).fill('Changed title');
  await expect(page.getByLabel('URL slug')).toHaveValue('my-custom-slug');
  await content.fill('The selected words');
  await content.press('ControlOrMeta+a');
  await page.getByRole('button', { name: 'Bold (Ctrl/⌘ B)', exact: true }).click();
  await expect(content.locator('strong')).toHaveText('The selected words');
  await expect(page.getByRole('button', { name: 'Bold (Ctrl/⌘ B)', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await content.locator('p').first().click();
  const sizes: number[] = [];
  for (const level of [1, 2, 3, 4]) {
    // Target the first paragraph explicitly; StarterKit adds a trailing paragraph after headings.
    await content.press('ControlOrMeta+Home');
    await page.getByLabel('Text style', { exact: true }).selectOption(String(level));
    // Tiptap restores focus on the next animation frame after a native select change.
    await expect(content).toBeFocused();
    await expect(content.locator(`h${level}`)).toHaveText('The selected words');
    sizes.push(
      await content
        .locator(`h${level}`)
        .evaluate((element) => parseFloat(getComputedStyle(element).fontSize)),
    );
  }
  expect(sizes[0]).toBeGreaterThan(sizes[1]);
  expect(sizes[1]).toBeGreaterThan(sizes[2]);
  expect(sizes[2]).toBeGreaterThan(sizes[3]);
  await page.getByLabel('Text style', { exact: true }).selectOption('paragraph');
  await content.click();
  await content.press('ControlOrMeta+a');
  await page.getByRole('button', { name: 'Insert or edit link', exact: true }).click();
  const link = page.getByRole('dialog', { name: 'Insert a link' });
  await expect(link.getByLabel('Link URL')).toBeFocused();
  await link.getByLabel('Link URL').fill('javascript:alert(1)');
  await link.getByRole('button', { name: 'Apply link', exact: true }).click();
  await expect(link.getByRole('alert')).toContainText('Enter a valid');
  await link.getByLabel('Link URL').fill('https://example.com');
  await link.getByRole('button', { name: 'Apply link', exact: true }).click();
  await expect(content.locator('a')).toHaveText('The selected words');
  await expect(content.locator('a')).toHaveAttribute('href', 'https://example.com');
  await expect(content).toBeFocused();
  await page.getByRole('button', { name: 'Insert image', exact: true }).click();
  const image = page.getByRole('dialog', { name: 'Insert an image' });
  await image.getByLabel('Inline image URL (HTTPS)').fill('http://example.com/image.png');
  await image.getByLabel('Image alternative text').fill('An image description');
  await image.getByRole('button', { name: 'Insert image', exact: true }).click();
  await expect(image.getByRole('alert')).toContainText('HTTPS');
  await image.getByRole('button', { name: 'Cancel', exact: true }).click();
  await content.press('End');
  await content.press('ArrowRight');
  await content.press('Enter');
  await page.getByRole('button', { name: 'Code block', exact: true }).click();
  await page.getByLabel('Code language', { exact: true }).selectOption('typescript');
  await page.keyboard.type('const answer = 42;');
  await expect(content.locator('pre code')).toContainText('const answer');
  await expect(content.locator('.hljs-keyword')).toBeVisible();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await page.addStyleTag({ content: 'astro-dev-toolbar{display:none}' });
  await page.evaluate(() => {
    (document.activeElement as HTMLElement)?.blur();
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  await page.screenshot({ path: testInfo.outputPath('editor-desktop.png'), fullPage: true });
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.evaluate(() => {
    (document.activeElement as HTMLElement)?.blur();
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  await page.screenshot({ path: testInfo.outputPath('editor-mobile.png'), fullPage: true });
  expect(
    (
      await new AxeBuilder({ page })
        .exclude('astro-dev-toolbar')
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  expect(errors).toEqual([]);
});

test('draft, preview, publish, update, unpublish and delete preserve the complete workflow', async ({
  page,
  request,
  editorial,
}) => {
  const fixture = editorial!;
  const slug = `${fixture.prefix}-workflow`;
  let id: string | undefined;
  await page.goto('/admin/posts/new');
  await page.getByLabel('Title', { exact: true }).fill(`${fixture.prefix} Workflow`);
  await page.getByLabel('URL slug').fill(slug);
  await page
    .getByLabel('Excerpt', { exact: true })
    .fill('Temporary publishing workflow verification.');
  const content = page.getByRole('textbox', { name: 'Article content', exact: true });
  await content.fill('A safe paragraph from the browser test.');
  await content.press('ControlOrMeta+a');
  await page.getByRole('button', { name: 'Insert or edit link', exact: true }).click();
  const link = page.getByRole('dialog', { name: 'Insert a link' });
  await link.getByLabel('Link URL').fill('https://example.com');
  await link.getByRole('button', { name: 'Apply link', exact: true }).click();
  await expect(content.locator('a')).toHaveAttribute('href', 'https://example.com');
  for (const category of fixture.categories)
    await page.getByLabel(category.name, { exact: true }).check();
  await expect(page.getByText('2 selected', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Article preview' })).toContainText(
    'A safe paragraph',
  );
  await expect(
    page.getByRole('region', { name: 'Article preview' }).getByRole('link'),
  ).toHaveAttribute('href', 'https://example.com');
  await page.getByRole('button', { name: 'Close preview', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Preview', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/posts\/[a-f0-9-]+$/);
  await expect(page.locator('[data-sonner-toast]')).toHaveText(/Article created successfully/);
  id = page.url().split('/').pop()!.split('?')[0];
  try {
    await expect(content.locator('a')).toHaveAttribute('href', 'https://example.com');
    expect((await request.get(`/blog/${slug}`)).status()).toBe(404);
    for (const category of fixture.categories)
      await expect(page.getByLabel(category.name, { exact: true })).toBeChecked();
    expect(
      (
        await page.request.post('/api/admin/posts', {
          headers: { Origin: 'https://evil.example' },
          data: {},
        })
      ).status(),
    ).toBe(403);
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Update article', exact: true })).toBeVisible();
    await expect(page.locator('[data-sonner-toast]')).toContainText(
      'Article published successfully.',
    );
    expect((await request.get(`/blog/${slug}`)).status()).toBe(200);
    expect(await (await request.get(`/blog/${slug}`)).text()).toContain(
      '<a href="https://example.com" rel="noopener noreferrer">',
    );
    expect(await (await request.get('/rss.xml')).text()).toContain(slug);
    expect(await (await request.get('/sitemap.xml')).text()).toContain(slug);
    await page.getByLabel('Excerpt', { exact: true }).fill('Updated while remaining published.');
    await page.getByRole('button', { name: 'Update article', exact: true }).click();
    await expect(page.getByText('All changes saved', { exact: true })).toBeVisible();
    expect(await (await request.get(`/blog/${slug}`)).text()).toContain(
      'Updated while remaining published.',
    );
    await page.getByRole('button', { name: 'Unpublish', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
    expect((await request.get(`/blog/${slug}`)).status()).toBe(200);
    await page.getByRole('button', { name: 'Unpublish', exact: true }).click();
    await page.getByRole('button', { name: 'Unpublish article', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Save draft', exact: true })).toBeVisible();
    await expect(page.locator('[data-sonner-toast]')).toContainText('Article unpublished');
    expect((await request.get(`/blog/${slug}`)).status()).toBe(404);
    await page.goto(`/admin/posts?q=${encodeURIComponent(`${fixture.prefix} Workflow`)}`);
    await page
      .getByRole('button', { name: `Delete article: ${fixture.prefix} Workflow`, exact: true })
      .click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByRole('alertdialog')).not.toBeVisible();
    await page
      .getByRole('button', { name: `Delete article: ${fixture.prefix} Workflow`, exact: true })
      .click();
    await page.getByRole('button', { name: 'Confirm deletion', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'No articles found.', exact: true }),
    ).toBeVisible();
  } finally {
    if (id)
      await page.request.delete('/api/admin/posts', {
        headers: { Origin: 'http://localhost:4321' },
        data: { id },
      });
  }
});

test('server validation appears beside the relevant article field', async ({ page, editorial }) => {
  const fixture = editorial!;
  await page.goto('/admin/posts/new');
  await page.getByLabel('Title', { exact: true }).fill('Duplicate slug verification');
  await page.getByLabel('URL slug').fill(fixture.posts[0].slug);
  await page.getByRole('textbox', { name: 'Article content', exact: true }).fill('Safe content.');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.locator('#slug-error')).toContainText('already in use');
  await expect(page.getByLabel('URL slug')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel('URL slug')).toBeFocused();
  await expect(page.locator('[data-sonner-toast][data-type=error]')).toContainText(
    'already in use',
  );
});

test('administrator can sign out and protected routes redirect', async ({
  page,
  context,
  editorial,
}) => {
  // Sign out a separate session so the shared fixture remains usable by later files.
  await context.clearCookies();
  expect(
    (
      await page.request.post('/api/auth/sign-in/email', {
        headers: { Origin: 'http://localhost:4321' },
        data: editorial!.credentials,
      })
    ).status(),
  ).toBe(200);
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Sign out', exact: true }).first().click();
  await expect(page).toHaveURL('/admin/login');
  await page.goto('/admin');
  await expect(page).toHaveURL('/admin/login');
});
