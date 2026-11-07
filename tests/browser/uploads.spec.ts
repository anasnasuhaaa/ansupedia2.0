import { test, expect, localDatabase } from './fixtures';
import { unlink } from 'node:fs/promises';
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
  'base64',
);

test.beforeEach(async ({ context, editorial }) => {
  test.skip(
    !localDatabase || !editorial || !!process.env.BLOB_READ_WRITE_TOKEN,
    'Image mutation tests use only a localhost database and the development upload adapter.',
  );
  await context.addCookies(editorial!.state.cookies);
});

test('file uploads map through edits and preserve image order through save, reopen and publish', async ({
  page,
  editorial,
}) => {
  const slug = `${editorial!.prefix}-images`;
  let src = '';
  let id = '';
  let finish!: () => void;
  const ready = new Promise<void>((resolve) => {
    finish = resolve;
  });
  await page.route('**/api/admin/upload', async (route) => {
    await ready;
    await route.continue();
  });
  try {
    await page.goto('/admin/posts/new');
    await page.getByLabel('Title', { exact: true }).fill(`${editorial!.prefix} Images`);
    await page.getByLabel('URL slug').fill(slug);
    const content = page.getByRole('textbox', { name: 'Article content', exact: true });
    await content.fill('Paragraph one.');
    await content.press('End');
    await content.press('Enter');
    await page.getByRole('button', { name: 'Insert image', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Insert an image' });
    await dialog.getByLabel('Image alternative text').fill('A test pixel');
    await dialog
      .getByLabel('Upload from device')
      .setInputFiles({ name: 'pixel.png', mimeType: 'image/png', buffer: png });
    await expect(dialog).not.toBeVisible();
    await expect(content).toBeFocused();
    await expect(content.locator('.image-upload-placeholder')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save draft', exact: true })).toBeDisabled();
    await content.press('ControlOrMeta+Home');
    await page.keyboard.type('Updated ');
    await content.press('ControlOrMeta+End');
    await page.keyboard.type('Paragraph two.');
    finish();
    await expect(content.locator('img:not(.image-upload-placeholder img)')).toHaveCount(1);
    await expect(page.locator('[data-sonner-toast][data-type=success]')).toContainText(
      'Image uploaded and inserted.',
    );
    src = (await content.locator('img').getAttribute('src'))!;
    expect(src).toMatch(/^\/dev-uploads\/[a-f0-9-]+\.png$/);
    const asset = await page.request.get(src);
    expect(asset.status()).toBe(200);
    expect(asset.headers()['content-type']).toBe('image/png');
    const order = async () =>
      content.evaluate((el) =>
        Array.from(el.children)
          .filter((el) => ['P', 'IMG'].includes(el.tagName))
          .map((el) => (el.tagName === 'IMG' ? 'image' : el.textContent))
          .filter(Boolean),
      );
    expect(await order()).toEqual(['Updated Paragraph one.', 'image', 'Paragraph two.']);
    // The image is an ordinary selectable document node with normal undo and redo.
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(content.locator('img')).toHaveCount(0);
    await page.getByRole('button', { name: 'Redo', exact: true }).click();
    await expect(content.locator('img')).toHaveCount(1);
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/posts\/[a-f0-9-]+/);
    id = page.url().split('/').pop()!.split('?')[0];
    await expect(content.locator('img')).toHaveAttribute('alt', 'A test pixel');
    expect(await order()).toEqual(['Updated Paragraph one.', 'image', 'Paragraph two.']);
    await page.reload();
    await expect(content.locator('img')).toHaveAttribute('src', src);
    expect(await order()).toEqual(['Updated Paragraph one.', 'image', 'Paragraph two.']);
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Update article', exact: true })).toBeVisible();
    await page.goto(`/blog/${slug}`);
    const publicOrder = await page.locator('.article-prose').evaluate((el) =>
      Array.from(el.children)
        .filter((el) => ['P', 'IMG'].includes(el.tagName))
        .map((el) => (el.tagName === 'IMG' ? 'image' : el.textContent))
        .filter(Boolean),
    );
    expect(publicOrder).toEqual(['Updated Paragraph one.', 'image', 'Paragraph two.']);
    await expect(page.locator('.article-prose img')).toHaveJSProperty('naturalWidth', 1);
  } finally {
    finish();
    if (id)
      await page.request.delete('/api/admin/posts', {
        headers: { Origin: 'http://localhost:4321' },
        data: { id },
      });
    if (/^\/dev-uploads\/[a-f0-9-]+\.png$/.test(src))
      await unlink(new URL(`../../.local/uploads/${src.split('/').pop()}`, import.meta.url));
  }
});

test('failed images never become document nodes and upload security checks remain enforced', async ({
  page,
  request,
}) => {
  await page.goto('/admin/posts/new');
  const content = page.getByRole('textbox', { name: 'Article content', exact: true });
  await content.fill('Keep this paragraph.');
  await page.getByRole('button', { name: 'Insert image', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Insert an image' });
  await dialog
    .getByLabel('Upload from device')
    .setInputFiles({ name: 'fake.png', mimeType: 'image/png', buffer: Buffer.from('not a PNG') });
  await expect(dialog.getByRole('alert')).toContainText('Only valid');
  await expect(page.locator('[data-sonner-toast][data-type=error]')).toContainText('Only valid');
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(content.locator('img')).toHaveCount(0);
  await expect(content).toHaveText('Keep this paragraph.');
  await expect(content.locator('.image-upload-placeholder')).toHaveCount(0);
  expect(
    (
      await request.post('/api/admin/upload', {
        multipart: { file: { name: 'pixel.png', mimeType: 'image/png', buffer: png } },
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await page.request.post('/api/admin/upload', {
        headers: { Origin: 'https://evil.example' },
        multipart: { file: { name: 'pixel.png', mimeType: 'image/png', buffer: png } },
      })
    ).status(),
  ).toBe(403);
  const invalid = await page.request.post('/api/admin/upload', {
    headers: { Origin: 'http://localhost:4321' },
    multipart: {
      file: {
        name: 'unsafe.svg',
        mimeType: 'image/svg+xml',
        buffer: Buffer.from('<svg onload="alert(1)"/>'),
      },
    },
  });
  expect(invalid.status()).toBe(400);
  expect((await page.request.get('/dev-uploads/not-an-image.svg')).status()).toBe(404);
});
