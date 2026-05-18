/**
 * Persistent cache for coin detail: instant hydration + offline / rate-limit fallback.
 * - localStorage: latest market snapshot (sync read on navigation)
 * - IndexedDB: chart line + OHLC series (async; larger payloads)
 */
import type { CoinLiveData } from "@/hooks/use-coins";

export type CachedLineChart = {
  prices: [number, number][];
  market_caps?: [number, number][];
  total_volumes?: [number, number][];
};

const LS_PREFIX = "ca-detail-snap:";
const LS_SYM_PREFIX = "ca-detail-sym:";
const DB_NAME = "coinastra-detail";
const DB_VER = 1;
const STORE_CHARTS = "charts";

const memChart = new Map<string, unknown>();

function lsKey(coinId: string): string {
  return `${LS_PREFIX}${coinId.toLowerCase()}`;
}

function lsSymKey(symbol: string): string {
  return `${LS_SYM_PREFIX}${symbol.toUpperCase()}`;
}

function readSnapshotRaw(key: string): PersistedSnapshot | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const p = JSON.parse(raw) as PersistedSnapshot;
    if (!p?.live?.id || !isDisplayablePrice(p.live.price)) return null;
    return p;
  } catch {
    return null;
  }
}

export type PersistedSnapshot = {
  updatedAt: number;
  live: CoinLiveData;
};

/** True when n is a real, displayable USD amount (not loading placeholder / bug). */
export function isDisplayableUsd(n: number | null | undefined): boolean {
  return n != null && Number.isFinite(n) && n > 0;
}

/** Valid spot price for display (avoids fake zeros). */
export function isDisplayablePrice(n: number | null | undefined): boolean {
  return n != null && Number.isFinite(n) && n > 0;
}

/** Sync read: prefer asset id, then last cache for this ticker. */
export function readPersistedDetail(coinId: string | undefined, symbolUpper: string): PersistedSnapshot | null {
  if (coinId) {
    const byId = readSnapshotRaw(lsKey(coinId));
    if (byId) return byId;
  }
  if (symbolUpper) return readSnapshotRaw(lsSymKey(symbolUpper));
  return null;
}

export function writeSnapshot(coinId: string, live: CoinLiveData): void {
  if (!coinId || typeof localStorage === "undefined") return;
  if (!isDisplayablePrice(live.price)) return;
  try {
    const payload: PersistedSnapshot = { updatedAt: Date.now(), live: { ...live } };
    const json = JSON.stringify(payload);
    localStorage.setItem(lsKey(coinId), json);
    localStorage.setItem(lsSymKey(live.symbol), json);
  } catch {
    /* quota */
  }
}

function chartKey(coinId: string, kind: "line" | "ohlc", days: number | string): string {
  return `${coinId.toLowerCase()}|${kind}|${days}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onerror = () => reject(req.error);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_CHARTS)) db.createObjectStore(STORE_CHARTS);
    };
    req.onsuccess = () => resolve(req.result);
  });
}

export async function readChartCache(
  coinId: string | undefined,
  kind: "line" | "ohlc",
  days: number | string,
): Promise<CachedLineChart | number[][] | null> {
  if (!coinId) return null;
  const k = chartKey(coinId, kind, days);
  if (memChart.has(k)) return memChart.get(k) as CachedLineChart | number[][] | null;
  try {
    const db = await openDb();
    const row = await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction(STORE_CHARTS, "readonly");
      const st = tx.objectStore(STORE_CHARTS);
      const g = st.get(k);
      g.onsuccess = () => resolve(g.result);
      g.onerror = () => reject(g.error);
    });
    db.close();
    if (row != null) memChart.set(k, row);
    return (row as CachedLineChart | number[][]) ?? null;
  } catch {
    return null;
  }
}

export async function writeChartCache(
  coinId: string,
  kind: "line" | "ohlc",
  days: number | string,
  data: CachedLineChart | number[][],
): Promise<void> {
  const k = chartKey(coinId, kind, days);
  memChart.set(k, data);
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_CHARTS, "readwrite");
      const st = tx.objectStore(STORE_CHARTS);
      const p = st.put(data, k);
      p.onsuccess = () => resolve();
      p.onerror = () => reject(p.error);
    });
    db.close();
  } catch {
    /* ignore */
  }
}
