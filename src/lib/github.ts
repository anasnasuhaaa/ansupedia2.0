import { DomUtils, parseDocument } from 'htmlparser2';
import { z } from 'zod';
import { env } from './env';

const profileStats = z.object({
  public_repos: z.number().int().nonnegative(),
  followers: z.number().int().nonnegative(),
});

const DAY_MS = 86_400_000;

interface ContributionDay {
  date: string;
  level: number;
  label?: string;
}

// Keep each source independent so an outage can fall back to its last successful response.
function cache<T>(load: () => Promise<T>) {
  let snapshot: T | null = null;
  let refreshAfter = 0;
  let pending: Promise<void> | undefined;

  return async () => {
    if (Date.now() >= refreshAfter) {
      pending ??= load()
        .then((data) => {
          snapshot = data;
          refreshAfter = Date.now() + 3_600_000;
        })
        .catch(() => {
          refreshAfter = Date.now() + 300_000;
        })
        .finally(() => {
          pending = undefined;
        });
      await pending;
    }
    return snapshot;
  };
}

export const getGitHubStats = cache(async () => {
  const token = env('GITHUB_STATS_TOKEN');
  const response = await fetch('https://api.github.com/users/anasnasuhaaa', {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Ansupedia-portfolio',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal: AbortSignal.timeout(1800),
  });
  if (!response.ok) throw new Error('GitHub profile statistics unavailable');
  return profileStats.parse(await response.json());
});

export const getGitHubContributionCalendar = cache(async () => {
  const response = await fetch('https://github.com/users/anasnasuhaaa/contributions', {
    headers: { 'Accept-Language': 'en-US', 'User-Agent': 'Ansupedia-portfolio' },
    signal: AbortSignal.timeout(1800),
  });
  if (!response.ok) throw new Error('GitHub contribution calendar unavailable');

  // Read only the public profile fragment, which works without a GitHub token.
  const { children } = parseDocument(await response.text());
  const heading = DomUtils.getElementById('js-contribution-activity-description', children);
  const totalText =
    heading &&
    DomUtils.textContent(heading)
      .trim()
      .match(/^([\d,]+)\s+contributions?\b/i);
  const total = totalText ? Number(totalText[1].replaceAll(',', '')) : NaN;

  const labels = new Map(
    DomUtils.getElementsByTagName('tool-tip', children).map((tip) => [
      tip.attribs.for,
      DomUtils.textContent(tip).trim(),
    ]),
  );
  const days: ContributionDay[] = [];
  for (const cell of DomUtils.getElementsByClassName('ContributionCalendar-day', children)) {
    const { 'data-date': date, 'data-level': level, id } = cell.attribs;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^[0-4]$/.test(level)) continue;
    days.push({ date, level: Number(level), label: labels.get(id) });
  }
  days.sort((a, b) => a.date.localeCompare(b.date));
  const start = Date.parse(days[0]?.date);
  const isFullCalendar =
    days.length >= 365 &&
    days.length <= 373 &&
    days.every(({ date }, index) => Date.parse(date) === start + index * DAY_MS);
  if (!Number.isSafeInteger(total) || !isFullCalendar) {
    throw new Error('Incomplete GitHub contribution calendar');
  }

  return { total, days };
});
