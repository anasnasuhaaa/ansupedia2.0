import { afterEach, expect, it, vi } from 'vitest';
import { safeUrl } from '../src/lib/blog/urls';
import { renderContent } from '../src/lib/blog/content';
import { storeImage, uploadsEnabled } from '../src/lib/uploads/storage';
import { GET } from '../src/pages/dev-uploads/[filename]';

afterEach(() => vi.unstubAllEnvs());
const imagePath = '/dev-uploads/10000000-0000-4000-8000-000000000000.png';
it('accepts only generated local asset paths in development and preserves document ordering', () => {
  vi.stubEnv('DEV', true);
  expect(safeUrl(imagePath, true)).toBe(true);
  for (const path of [
    '/dev-uploads/../secrets.png',
    '/dev-uploads/arbitrary.svg',
    '//evil.test/image.png',
    imagePath + '?file=evil',
    'http://localhost:4321/image.png',
  ])
    expect(safeUrl(path, true)).toBe(false);
  const paragraph = (text: string) => ({ type: 'paragraph', content: [{ type: 'text', text }] });
  const html = renderContent({
    type: 'doc',
    content: [
      paragraph('Before'),
      { type: 'image', attrs: { src: imagePath, alt: '<script>unsafe</script>' } },
      paragraph('After'),
    ],
  });
  expect(html).toMatch(/<p>Before<\/p><img[^>]+><p>After<\/p>/);
  expect(html).not.toContain('<script>');
  expect(html).toContain(`src="${imagePath}"`);
});
it('production disables local storage, local asset serving and local image URLs', async () => {
  vi.stubEnv('DEV', false);
  vi.stubEnv('BLOB_READ_WRITE_TOKEN', '');
  expect(uploadsEnabled()).toBe(false);
  expect(safeUrl(imagePath, true)).toBe(false);
  await expect(storeImage(new Uint8Array([1]), 'image/png')).rejects.toThrow(
    'Persistent image storage',
  );
  const response = await GET({
    params: { filename: imagePath.split('/').pop() },
  } as unknown as Parameters<typeof GET>[0]);
  expect(response.status).toBe(404);
});
