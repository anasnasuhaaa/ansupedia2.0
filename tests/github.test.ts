import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.resetModules();
});

it('coalesces GitHub reads and serves the last successful snapshot during outages', async () => {
  vi.useFakeTimers();
  const fetchStats = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ public_repos: 4, followers: 0 }));
  vi.stubGlobal('fetch', fetchStats);
  const { getGitHubStats } = await import('../src/lib/github');
  const [first, concurrent] = await Promise.all([getGitHubStats(), getGitHubStats()]);
  expect(first).toMatchObject({ public_repos: 4, followers: 0 });
  expect(concurrent).toEqual(first);
  expect(await getGitHubStats()).toEqual(first);
  expect(fetchStats).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(3_600_001);
  fetchStats.mockResolvedValueOnce(new Response(null, { status: 403 }));
  expect(await getGitHubStats()).toEqual(first);
  expect(await getGitHubStats()).toEqual(first);
  expect(fetchStats).toHaveBeenCalledTimes(2);
});

it('backs off on an incomplete response and recovers without credentials', async () => {
  vi.useFakeTimers();
  const fetchStats = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ followers: 12 }))
    .mockResolvedValueOnce(Response.json({ public_repos: 4, followers: 12 }));
  vi.stubGlobal('fetch', fetchStats);
  const { getGitHubStats } = await import('../src/lib/github');
  expect(await getGitHubStats()).toBeNull();
  expect(await getGitHubStats()).toBeNull();
  vi.advanceTimersByTime(300_001);
  expect(await getGitHubStats()).toMatchObject({ public_repos: 4, followers: 12 });
  expect(fetchStats).toHaveBeenCalledTimes(2);
});
