import { afterEach, beforeEach, expect, it, vi } from 'vitest';

// Exercise the real auth handler without connecting to a local or production database.
vi.mock('../src/db/client', () => ({ getDb: () => ({}) }));
vi.mock('@better-auth/drizzle-adapter', async () => {
  const { memoryAdapter } = await import('better-auth/adapters/memory');
  return {
    drizzleAdapter: () =>
      memoryAdapter({ user: [], session: [], account: [], verification: [], rateLimit: [] }),
  };
});

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('BETTER_AUTH_SECRET', 'test-only-secret-for-origin-regressions-123456789');
  vi.stubEnv('BETTER_AUTH_URL', 'https://ansupedia.my.id');
});
afterEach(() => vi.unstubAllEnvs());

async function signIn(origin: string) {
  const { getAuth } = await import('../src/lib/auth/server');
  const auth = getAuth();
  // Better Auth disables origin checks under Vitest; restore production behavior.
  (await auth.$context).skipOriginCheck = false;
  return auth.handler(
    new Request(`${origin}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' },
      body: JSON.stringify({ email: 'missing@example.com', password: 'test-password-123' }),
    }),
  );
}

it.each(['https://ansupedia.my.id', 'https://www.ansupedia.my.id'])(
  'allows production login from %s to reach credential validation',
  async (origin) => {
    const response = await signIn(origin);
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: 'INVALID_EMAIL_OR_PASSWORD' });
  },
);

it.each([
  'https://evil.example',
  'https://other.ansupedia.my.id',
  'https://www.ansupedia.my.id.evil.example',
  'http://www.ansupedia.my.id',
  'http://localhost:4321',
])('rejects login from untrusted origin %s in production', async (origin) => {
  const response = await signIn(origin);
  expect(response.status).toBe(403);
  expect(await response.json()).toMatchObject({ code: 'INVALID_ORIGIN' });
});

it('preserves local login when BETTER_AUTH_URL points to the dev server', async () => {
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubEnv('BETTER_AUTH_URL', 'http://localhost:4321');
  const response = await signIn('http://localhost:4321');
  expect(response.status).toBe(401);
  expect(await response.json()).toMatchObject({ code: 'INVALID_EMAIL_OR_PASSWORD' });
});
