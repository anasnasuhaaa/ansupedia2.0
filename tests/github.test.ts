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

it('reads the public contribution total and dates, keeping the last calendar if GitHub changes its markup', async () => {
  vi.useFakeTimers();
  const cells = Array.from({ length: 365 }, (_, index) => {
    const date = new Date(Date.UTC(2025, 0, index + 1)).toISOString().slice(0, 10);
    return `<td class="ContributionCalendar-day" id="day-${index}" data-date="${date}" data-level="${index === 0 ? 3 : 0}"></td>`;
  }).reverse();
  const fetchCalendar = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(`
      <h2 id="js-contribution-activity-description">1,234 contributions in the last year</h2>
      <table><tbody><tr>${cells.join('')}</tr></tbody></table>
      <tool-tip for="day-0">5 contributions on January 1st.</tool-tip>
    `),
    )
    .mockResolvedValueOnce(new Response('<h2>Profile unavailable</h2>'));
  vi.stubGlobal('fetch', fetchCalendar);
  const { getGitHubContributionCalendar } = await import('../src/lib/github');
  const calendar = await getGitHubContributionCalendar();
  expect(calendar?.total).toBe(1234);
  expect(calendar?.days).toHaveLength(365);
  expect(calendar?.days[0]).toEqual({
    date: '2025-01-01',
    level: 3,
    label: '5 contributions on January 1st.',
  });
  expect(calendar?.days.at(-1)?.date).toBe('2025-12-31');

  vi.advanceTimersByTime(3_600_001);
  expect(await getGitHubContributionCalendar()).toEqual(calendar);
  expect(await getGitHubContributionCalendar()).toEqual(calendar);
  expect(fetchCalendar).toHaveBeenCalledTimes(2);
});
