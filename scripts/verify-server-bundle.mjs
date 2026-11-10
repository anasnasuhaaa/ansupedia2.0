import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

assert.equal(
  process.features.require_module,
  false,
  'Run with --no-experimental-require-module to reproduce the Vercel loading constraint.',
);

// Exercise the built Vercel function without accessing any configured database.
process.env.NODE_ENV = 'production';
process.env.DATABASE_URL = 'disabled-for-bundle-verification';
process.env.PUBLIC_SITE_URL = 'https://example.invalid';
process.env.BETTER_AUTH_URL = 'https://example.invalid';

const functionRoot = new URL('../.vercel/output/functions/_render.func/', import.meta.url);
const { handler } = JSON.parse(await readFile(new URL('.vc-config.json', functionRoot), 'utf8'));
const { default: app } = await import(new URL(handler, functionRoot).href);
assert.equal(typeof app.fetch, 'function');

for (const [path, expectedStatus, expectedContent] of [
  ['/', 200, 'Tech Stack'],
  ['/blog', 200, "Ansupedia's Blog"],
  ['/rss.xml', 200, '<rss'],
  ['/admin/login', 200, 'Sign in'],
]) {
  const response = await app.fetch(new Request(`https://example.invalid${path}`));
  const html = await response.text();
  assert.equal(response.status, expectedStatus, `${path} returned ${response.status}`);
  assert.ok(html.includes(expectedContent), `${path} is missing its expected content`);
  console.log(`${path}: ${response.status}`);
}
