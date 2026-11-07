import { describe, it, expect } from 'vitest';
import { validateContent, renderContent, safeUrl, readingTime } from '../src/lib/blog/content';
import { slugSchema, postInput } from '../src/lib/validation/post';
import { isAdmin, isSameOrigin } from '../src/lib/auth/guards';
const document = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: '<script>alert(1)</script>' }] }],
};
describe('article content safety', () => {
  it('escapes text and rejects scripts and unsafe links', () => {
    expect(renderContent(document)).toContain('&lt;script&gt;');
    expect(renderContent(document)).not.toContain('<script>');
    expect(() => validateContent({ type: 'doc', content: [{ type: 'script' }] })).toThrow();
    expect(() =>
      validateContent({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'x',
                marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }],
              },
            ],
          },
        ],
      }),
    ).toThrow();
  });
  it('rejects unsupported attributes, malformed hierarchy, and excess depth', () => {
    expect(() =>
      validateContent({ type: 'doc', content: [{ type: 'paragraph', attrs: { onclick: 'x' } }] }),
    ).toThrow();
    expect(() =>
      validateContent({ type: 'doc', content: [{ type: 'text', text: 'x' }] }),
    ).toThrow();
    let deep: unknown = { type: 'paragraph' };
    for (let i = 0; i < 35; i++) deep = { type: 'blockquote', content: [deep] };
    expect(() => validateContent({ type: 'doc', content: [deep] })).toThrow();
  });
  it('renders permitted formatting and sanitizes target attributes', () => {
    const html = renderContent({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Heading' }] },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Link',
              marks: [
                {
                  type: 'link',
                  attrs: { href: 'https://example.com', target: 'evil', class: 'evil' },
                },
              ],
            },
          ],
        },
      ],
    });
    expect(html).toContain('<h2>Heading</h2>');
    expect(html).toContain('noopener noreferrer');
    expect(html).not.toContain('evil');
  });
  it('renders all supported heading levels and rejects unsupported levels', () => {
    for (const level of [1, 2, 3, 4]) {
      expect(
        renderContent({
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: { level },
              content: [{ type: 'text', text: `Heading ${level}` }],
            },
          ],
        }),
      ).toContain(`<h${level}>Heading ${level}</h${level}>`);
    }
    expect(() =>
      validateContent({ type: 'doc', content: [{ type: 'heading', attrs: { level: 5 } }] }),
    ).toThrow();
  });
  it('restricts image URLs and highlights code safely', () => {
    expect(safeUrl('data:image/svg+xml,x', true)).toBe(false);
    expect(safeUrl('//evil.test', true)).toBe(false);
    expect(safeUrl('https://example.com/a.png', true)).toBe(true);
    const code = renderContent({
      type: 'doc',
      content: [
        {
          type: 'codeBlock',
          attrs: { language: 'javascript' },
          content: [{ type: 'text', text: 'const x = "<script>";' }],
        },
      ],
    });
    expect(code).toContain('hljs');
    expect(code).toContain('<pre tabindex="0">');
    expect(readingTime(document)).toBe(1);
  });
});
describe('validation and authorization', () => {
  it('accepts canonical slugs and rejects ambiguous ones', () => {
    expect(slugSchema.safeParse('learning-notes-1').success).toBe(true);
    for (const slug of ['A', 'a--b', '../admin', 'a b', ''])
      expect(slugSchema.safeParse(slug).success).toBe(false);
  });
  it('requires explicit administrator role and exact origin', () => {
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin({ role: 'user' })).toBe(false);
    expect(isAdmin({ role: 'admin' })).toBe(true);
    expect(
      isSameOrigin(
        new Request('https://site.test/api/admin/posts', {
          method: 'POST',
          headers: { origin: 'https://evil.test' },
        }),
      ),
    ).toBe(false);
    expect(
      isSameOrigin(
        new Request('https://site.test/api/admin/posts', {
          method: 'POST',
          headers: { origin: 'https://site.test' },
        }),
      ),
    ).toBe(true);
  });
  it('requires cover descriptions and rejects invalid category IDs', () => {
    expect(
      postInput.safeParse({
        title: 'Title',
        slug: 'title',
        excerpt: '',
        contentJson: document,
        status: 'draft',
        isFeatured: false,
        categoryIds: ['invalid'],
      }).success,
    ).toBe(false);
  });
});
