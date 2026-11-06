import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('public routes, themes and mobile layout', async ({ page, request }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Anas Nasuha', exact: true })).toBeVisible();
  await page.selectOption('#theme-select', 'dark');
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
  ).toEqual([]);
  await page.screenshot({ path: '/tmp/ansupedia-desktop.png', fullPage: true });
  await page.selectOption('#theme-select', 'light');
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
  ).toEqual([]);
  await page.screenshot({ path: '/tmp/ansupedia-mobile.png', fullPage: true });
  for (const path of ['/blog', '/rss.xml', '/sitemap.xml', '/robots.txt', '/admin/login'])
    expect((await request.get(path)).status()).toBe(200);
  expect((await request.get('/blog/missing-fixture')).status()).toBe(404);
  expect((await request.post('/api/admin/posts', { data: {} })).status()).toBe(401);
  expect((await request.get('/admin', { maxRedirects: 0 })).status()).toBe(302);
  expect((await request.post('/api/auth/sign-up/email', { data: {} })).status()).toBe(404);
  expect(errors).toEqual([]);
});
test('administrator signs in, writes, previews, publishes and deletes an article', async ({
  page,
  request,
}) => {
  test.skip(
    !process.env.SEED_ADMIN_EMAIL || !process.env.SEED_ADMIN_PASSWORD,
    'Requires temporary local admin credentials.',
  );
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/admin/login');
  await page.getByLabel('Email', { exact: true }).fill(process.env.SEED_ADMIN_EMAIL!);
  await page.getByLabel('Password', { exact: true }).fill(process.env.SEED_ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL('/admin');
  await page.getByRole('link', { name: 'New article', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Article content', exact: true })).toBeVisible();
  const slug = `browser-test-${Date.now()}`;
  await page.getByLabel('Title', { exact: true }).fill('Browser verification fixture');
  await page.getByLabel('URL slug').fill(slug);
  await page.getByLabel('Excerpt', { exact: true }).fill('Temporary verification article.');
  await page
    .getByRole('textbox', { name: 'Article content', exact: true })
    .fill('A safe paragraph from the browser test.');
  await page.getByLabel('Software Engineering', { exact: true }).check();
  await page.getByLabel('Learning Notes', { exact: true }).check();
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Article preview' })).toContainText(
    'A safe paragraph',
  );
  await page.getByRole('button', { name: 'Close preview' }).click();
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/posts\/[a-f0-9-]+\?saved=1/);
  const id = page.url().split('/').pop()!.split('?')[0];
  const createdCategory = await page.request.post('/api/admin/categories', {
    headers: { Origin: 'http://localhost:4321' },
    data: { name: slug, slug },
  });
  expect(createdCategory.ok()).toBe(true);
  const categoryId = (await createdCategory.json()).id;
  const renamed = await page.request.post('/api/admin/categories', {
    headers: { Origin: 'http://localhost:4321' },
    data: { id: categoryId, name: slug + ' updated', slug: slug + '-updated' },
  });
  expect(renamed.ok()).toBe(true);
  await page.request.delete('/api/admin/categories', {
    headers: { Origin: 'http://localhost:4321' },
    data: { id: categoryId },
  });
  try {
    expect((await request.get(`/blog/${slug}`)).status()).toBe(404);
    await expect(page.getByLabel('Software Engineering', { exact: true })).toBeChecked();
    await expect(page.getByLabel('Learning Notes', { exact: true })).toBeChecked();
    const csrf = await page.request.post('/api/admin/posts', {
      headers: { Origin: 'https://evil.example' },
      data: {},
    });
    expect(csrf.status()).toBe(403);
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Article saved.', { exact: true })).toBeVisible();
    expect((await request.get(`/blog/${slug}`)).status()).toBe(200);
    expect(await (await request.get('/rss.xml')).text()).toContain(slug);
    await page.goto(`/blog/${slug}`);
    await expect(page.locator('.prose')).toContainText('A safe paragraph');
    await page.goto(`/admin/posts/${id}`);
    await page.getByRole('button', { name: 'Save as draft / unpublish' }).click();
    await page.waitForURL(/saved=1/);
    expect((await request.get(`/blog/${slug}`)).status()).toBe(404);
    await page.goto(`/admin/posts?q=${slug}`);
    // Search the unique fixture title instead of its URL slug.
    await page.getByRole('searchbox').fill('Browser verification fixture');
    await page.getByRole('button', { name: 'Filter', exact: true }).click();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByRole('alertdialog')).not.toBeVisible();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm deletion', exact: true }).click();
    await expect(page.getByText('No articles found.', { exact: true })).toBeVisible();
  } finally {
    await page.request.delete('/api/admin/posts', {
      headers: { Origin: 'http://localhost:4321' },
      data: { id },
    });
  }
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL('/admin/login');
  expect(errors).toEqual([]);
});

test('login attempts are rate limited', async ({ request }) => {
  let limited = false;
  for (let i = 0; i < 6; i++) {
    const response = await request.post('/api/auth/sign-in/email', {
      headers: { Origin: 'http://localhost:4321' },
      data: { email: 'nonexistent@example.invalid', password: 'not-a-real-password-123' },
    });
    if (response.status() === 429) limited = true;
    else expect(response.status()).toBe(401);
  }
  expect(limited).toBe(true);
});
