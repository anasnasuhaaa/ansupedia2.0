import { z } from 'zod';
import { env } from './env';

const profileStats = z.object({
  public_repos: z.number().int().nonnegative(),
  followers: z.number().int().nonnegative(),
});
type Snapshot = z.infer<typeof profileStats> & { checkedAt: string };

let snapshot: Snapshot | null = null;
let refreshAfter = 0;
let pending: Promise<void> | undefined;

// One cache per warm SSR instance. Coalesce concurrent misses and back off on failure.
async function refresh() {
  try {
    const token = env('GITHUB_STATS_TOKEN');
    const response = await fetch('https://api.github.com/users/anasnasuhaaa', {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Ansupedia-portfolio',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: AbortSignal.timeout(1800),
    });
    if (!response.ok) throw new Error('GitHub unavailable');
    const stats = profileStats.parse(await response.json());
    snapshot = { ...stats, checkedAt: new Date().toISOString() };
    refreshAfter = Date.now() + 3_600_000;
  } catch {
    refreshAfter = Date.now() + 300_000;
  }
}

export async function getGitHubStats() {
  if (Date.now() >= refreshAfter) {
    pending ??= refresh().finally(() => {
      pending = undefined;
    });
    await pending;
  }
  return snapshot;
}
