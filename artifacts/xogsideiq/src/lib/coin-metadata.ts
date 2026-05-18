/**
 * Local coin metadata index — instant lookup without network round trips.
 * Source: /data/coins-market-metadata.json (generated at build time).
 */

import type { MetadataCoin, MetadataPayload } from "@/hooks/use-optimized-markets";

export type { MetadataCoin, MetadataPayload };

export type CoinMetadataIndex = {
  payload: MetadataPayload;
  byId: Map<string, MetadataCoin>;
  bySymbol: Map<string, MetadataCoin>;
};

let indexPromise: Promise<CoinMetadataIndex> | null = null;

function buildIndex(payload: MetadataPayload): CoinMetadataIndex {
  const byId = new Map<string, MetadataCoin>();
  const bySymbol = new Map<string, MetadataCoin>();
  for (const c of payload.coins) {
    if (!c.id || byId.has(c.id)) continue;
    byId.set(c.id, c);
    const sym = c.symbol.toLowerCase();
    const existing = bySymbol.get(sym);
    if (!existing || c.r < existing.r) bySymbol.set(sym, c);
  }
  return { payload, byId, bySymbol };
}

export async function loadCoinMetadataIndex(): Promise<CoinMetadataIndex> {
  if (!indexPromise) {
    indexPromise = (async () => {
      const r = await fetch("/data/coins-market-metadata.json", { cache: "force-cache" });
      if (!r.ok) throw new Error(`metadata ${r.status}`);
      const payload = (await r.json()) as MetadataPayload;
      return buildIndex(payload);
    })();
  }
  return indexPromise;
}

export function lookupById(index: CoinMetadataIndex | undefined, id: string | undefined): MetadataCoin | undefined {
  if (!index || !id) return undefined;
  return index.byId.get(id.toLowerCase());
}

export function lookupBySymbol(index: CoinMetadataIndex | undefined, symbol: string | undefined): MetadataCoin | undefined {
  if (!index || !symbol) return undefined;
  return index.bySymbol.get(symbol.toLowerCase());
}

export function resolveCoin(
  index: CoinMetadataIndex | undefined,
  symbol: string,
  coinId?: string | null,
): MetadataCoin | undefined {
  if (!index) return undefined;
  if (coinId) return lookupById(index, coinId) ?? lookupBySymbol(index, symbol);
  return lookupBySymbol(index, symbol);
}

/** Preload logo into browser cache */
export function preloadCoinLogo(url: string | undefined): void {
  if (!url || typeof window === "undefined") return;
  const img = new Image();
  img.decoding = "async";
  img.src = url;
}
