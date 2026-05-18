import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { CoinLiveData } from "@/hooks/use-coins";
import { ExternalLink, Layers, TrendingUp } from "lucide-react";

const CARD = { background: "rgba(10,14,22,0.92)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16 };

export function CategoriesStrip({ categories, loading }: { categories?: string[]; loading?: boolean }) {
  if (loading) return <Skeleton className="h-8 w-full rounded-xl" />;
  if (!categories?.length) {
    return (
      <p className="text-[11px] py-2" style={{ color: "#5a6072" }}>
        Categories load after market enrichment.
      </p>
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5 min-w-0">
      {categories.map((c) => (
        <span
          key={c}
          className="text-[10px] font-semibold px-2.5 py-1 rounded-lg shrink-0"
          style={{ background: "rgba(41,98,255,0.12)", color: "#4d7fff", border: "1px solid rgba(41,98,255,0.2)" }}
        >
          {c}
        </span>
      ))}
    </div>
  );
}

export function ExchangeListings({
  exchanges,
  loading,
}: {
  exchanges?: CoinLiveData["exchanges"];
  loading?: boolean;
}) {
  return (
    <div className="rounded-2xl p-4 min-w-0 overflow-hidden" style={CARD}>
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="h-4 w-4" style={{ color: "#4d7fff" }} aria-hidden />
        <span className="text-[12px] font-bold text-white">Exchange listings</span>
      </div>
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full rounded-xl" />
          ))}
        </div>
      ) : !exchanges?.length ? (
        <p className="text-[11px]" style={{ color: "#5a6072" }}>
          No exchange tickers returned for this asset.
        </p>
      ) : (
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {exchanges.map((ex) => (
            <div
              key={`${ex.name}-${ex.pair}`}
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl min-w-0"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
            >
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-white truncate">{ex.name}</div>
                <div className="text-[9px] font-mono" style={{ color: "#5a6072" }}>
                  {ex.pair}
                </div>
              </div>
              {ex.volume != null && ex.volume > 0 && (
                <span className="text-[10px] font-mono shrink-0" style={{ color: "#8a90a8" }}>
                  ${ex.volume >= 1e6 ? `${(ex.volume / 1e6).toFixed(1)}M` : ex.volume.toLocaleString()}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function BlockchainNetworks({
  platforms,
  explorers,
  loading,
}: {
  platforms?: Record<string, string>;
  explorers?: string[];
  loading?: boolean;
}) {
  const entries = platforms ? Object.entries(platforms).filter(([, addr]) => addr) : [];
  return (
    <div className="rounded-2xl p-4 min-w-0 overflow-hidden" style={CARD}>
      <div className="flex items-center gap-2 mb-3">
        <Layers className="h-4 w-4" style={{ color: "#4d7fff" }} aria-hidden />
        <span className="text-[12px] font-bold text-white">Blockchain / contracts</span>
      </div>
      {loading ? (
        <Skeleton className="h-20 w-full rounded-xl" />
      ) : entries.length === 0 && !explorers?.length ? (
        <p className="text-[11px]" style={{ color: "#5a6072" }}>No on-chain contract data listed.</p>
      ) : (
        <div className="space-y-2">
          {entries.map(([chain, addr]) => (
            <div key={chain} className="rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="text-[10px] font-bold uppercase" style={{ color: "#4d7fff" }}>
                {chain}
              </div>
              <div className="text-[10px] font-mono truncate mt-0.5" style={{ color: "#8a90a8" }}>
                {addr}
              </div>
            </div>
          ))}
          {explorers?.slice(0, 4).map((url) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-[11px] font-semibold truncate hover:underline"
              style={{ color: "#4d7fff" }}
            >
              Explorer <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
