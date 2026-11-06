import { getSchema, type JSONContent } from '@tiptap/core';
import { renderToHTMLString } from '@tiptap/static-renderer/pm/html-string';
import sanitizeHtml from 'sanitize-html';
import hljs from 'highlight.js';
import { extensions } from './extensions';
const nodes = new Set([
  'doc',
  'paragraph',
  'text',
  'heading',
  'codeBlock',
  'bulletList',
  'orderedList',
  'listItem',
  'blockquote',
  'hardBreak',
  'horizontalRule',
  'image',
]);
const marks = new Set(['bold', 'italic', 'strike', 'code', 'link']);
export function safeUrl(value: unknown, image = false): boolean {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return (image ? ['https:'] : ['https:', 'http:', 'mailto:']).includes(url.protocol);
  } catch {
    return false;
  }
}
export function validateContent(value: unknown): JSONContent {
  if (JSON.stringify(value)?.length > 500_000) throw new Error('Article exceeds 500 KB.');
  let count = 0;
  const walk = (node: unknown, depth: number): void => {
    if (depth > 30 || ++count > 10000) throw new Error('Document is too complex.');
    if (!node || typeof node !== 'object' || Array.isArray(node))
      throw new Error('Invalid document node.');
    const n = node as JSONContent;
    if (
      !n.type ||
      !nodes.has(n.type) ||
      Object.keys(n).some((k) => !['type', 'text', 'attrs', 'marks', 'content'].includes(k))
    )
      throw new Error('Unsupported document node.');
    const allowed =
      n.type === 'heading'
        ? ['level']
        : n.type === 'image'
          ? ['src', 'alt', 'title', 'width', 'height']
          : n.type === 'codeBlock'
            ? ['language']
            : n.type === 'orderedList'
              ? ['start', 'type']
              : [];
    if (n.attrs && Object.keys(n.attrs).some((k) => !allowed.includes(k)))
      throw new Error('Unsupported node attribute.');
    if (n.type === 'heading' && ![2, 3, 4].includes(n.attrs?.level))
      throw new Error('Use headings H2–H4.');
    if (n.type === 'image' && !safeUrl(n.attrs?.src, true))
      throw new Error('Images require an HTTPS URL.');
    if (n.marks) {
      if (!Array.isArray(n.marks)) throw new Error('Invalid marks.');
      for (const m of n.marks) {
        if (!marks.has(m.type) || Object.keys(m).some((k) => !['type', 'attrs'].includes(k)))
          throw new Error('Unsupported mark.');
        if (m.type === 'link') {
          if (
            !safeUrl(m.attrs?.href) ||
            Object.keys(m.attrs || {}).some((k) => !['href', 'target', 'rel', 'class'].includes(k))
          )
            throw new Error('Invalid link.');
        } else if (m.attrs && Object.keys(m.attrs).length)
          throw new Error('Unsupported mark attribute.');
      }
    }
    if (n.content) {
      if (!Array.isArray(n.content)) throw new Error('Invalid content.');
      n.content.forEach((child) => walk(child, depth + 1));
    }
  };
  walk(value, 0);
  if ((value as JSONContent).type !== 'doc') throw new Error('Root must be a document.');
  const schema = getSchema(extensions());
  const doc = schema.nodeFromJSON(value);
  doc.check();
  return doc.toJSON();
}
export function renderContent(value: unknown): string {
  const content = validateContent(value);
  const html = renderToHTMLString({ content, extensions: extensions() });
  return sanitizeHtml(html, {
    allowedTags: [
      'p',
      'h2',
      'h3',
      'h4',
      'strong',
      'em',
      's',
      'code',
      'pre',
      'ul',
      'ol',
      'li',
      'blockquote',
      'a',
      'img',
      'br',
      'hr',
      'span',
    ],
    allowedAttributes: {
      a: ['href', 'rel', 'target'],
      img: ['src', 'alt', 'title', 'width', 'height'],
      code: ['class'],
      span: ['class'],
      ol: ['start'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: { img: ['https'] },
    allowProtocolRelative: false,
    transformTags: {
      a: (_tag, attrs) => ({
        tagName: 'a',
        attribs: { href: attrs.href || '', rel: 'noopener noreferrer' },
      }),
    },
  }).replace(
    /<pre><code(?: class="language-([\w+-]+)")?>([\s\S]*?)<\/code><\/pre>/g,
    (_match, language, code) => {
      const decoded = code
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&');
      const highlighted =
        language && hljs.getLanguage(language)
          ? hljs.highlight(decoded, { language }).value
          : hljs.highlight(decoded, { language: 'plaintext' }).value;
      return `<pre><code class="hljs">${highlighted}</code></pre>`;
    },
  );
}
export function readingTime(content: JSONContent): number {
  const text = (node: JSONContent): string =>
    [node.text || '', ...(node.content || []).map(text)].join(' ');
  return Math.max(1, Math.ceil(text(content).split(/\s+/).filter(Boolean).length / 200));
}
