/**
 * Client-side API cache: deduplication, stale-while-revalidate, timeout fallback.
 * Prepares for future WebSocket price bridge (see live-prices-bridge.ts).
 */

export type CachePolicy = {
  /** Data considered fresh — no background refetch */
  freshMs: number;
  /** Serve stale data while revalidating */
  staleMs: number;
  /** Abort fetch after this; return last good data if any */
  timeoutMs?: number;
};

type Entry<T> = {
  data: T;
  freshUntil: number;
  staleUntil: number;
};

const store = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export function clearApiCache(prefix?: string): void {
  if (!prefix) {
    store.clear();
    return;
  }
  for (const k of store.keys()) {
    if (k.startsWith(prefix)) store.delete(k);
  }
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
  } finally {
    clearTimeout(t);
  }
}

/**
 * Cached JSON fetch with in-flight deduplication and stale-while-revalidate.
 */
export async function cachedJsonFetch<T>(
  url: string,
  policy: CachePolicy,
  init?: RequestInit,
): Promise<T> {
  const now = Date.now();
  const timeoutMs = policy.timeoutMs ?? 5_000;
  const entry = store.get(url) as Entry<T> | undefined;

  if (entry && now < entry.freshUntil) return entry.data;

  if (entry && now < entry.staleUntil) {
    if (!inflight.has(url)) {
      const p = revalidate<T>(url, policy, init, entry.data).finally(() => inflight.delete(url));
      inflight.set(url, p);
    }
    return entry.data;
  }

  if (inflight.has(url)) return inflight.get(url) as Promise<T>;

  const p = revalidate<T>(url, policy, init, entry?.data).finally(() => inflight.delete(url));
  inflight.set(url, p);
  return p;
}

async function revalidate<T>(
  url: string,
  policy: CachePolicy,
  init: RequestInit | undefined,
  fallback: T | undefined,
): Promise<T> {
  const timeoutMs = policy.timeoutMs ?? 5_000;
  const now = Date.now();
  try {
    const r = await fetchWithTimeout(url, timeoutMs);
    if (!r.ok) throw new Error(`${url} → ${r.status}`);
    const data = (await r.json()) as T;
    store.set(url, {
      data,
      freshUntil: now + policy.freshMs,
      staleUntil: now + policy.staleMs,
    });
    return data;
  } catch (err) {
    const stale = store.get(url) as Entry<T> | undefined;
    if (stale) return stale.data;
    if (fallback !== undefined) return fallback;
    throw err;
  }
}

/** Standard TTL presets aligned with backend CoinGecko cache */
export const API_CACHE = {
  prices: { freshMs: 30_000, staleMs: 120_000, timeoutMs: 5_000 } satisfies CachePolicy,
  markets: { freshMs: 30_000, staleMs: 120_000, timeoutMs: 5_000 } satisfies CachePolicy,
  coinDetail: { freshMs: 300_000, staleMs: 600_000, timeoutMs: 5_000 } satisfies CachePolicy,
  global: { freshMs: 60_000, staleMs: 300_000, timeoutMs: 5_000 } satisfies CachePolicy,
  categories: { freshMs: 3_600_000, staleMs: 7_200_000, timeoutMs: 5_000 } satisfies CachePolicy,
  metadata: { freshMs: Number.POSITIVE_INFINITY, staleMs: Number.POSITIVE_INFINITY } satisfies CachePolicy,
} as const;
