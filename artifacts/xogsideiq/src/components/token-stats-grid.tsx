import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { CoinLiveData } from "@/hooks/use-coins";

const CARD = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.05)",
};

function fmtUsd(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n === 0) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

function fmtNum(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  return n.toLocaleString();
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

type Props = {
  live?: CoinLiveData;
  loading?: boolean;
};

export function TokenStatsGrid({ live, loading }: Props) {
  const volMcap =
    live?.marketCap && live.volume24h
      ? `${((live.volume24h / live.marketCap) * 100).toFixed(2)}%`
      : "—";
  const circMax =
    live?.maxSupply && live.circulatingSupply
      ? `${((live.circulatingSupply / live.maxSupply) * 100).toFixed(1)}%`
      : "—";

  const rows: { label: string; value: string; accent?: string }[] = [
    { label: "Market cap", value: fmtUsd(live?.marketCap) },
    { label: "24h volume", value: fmtUsd(live?.volume24h) },
    { label: "FDV", value: fmtUsd(live?.fdv) },
    { label: "Vol / MCap", value: volMcap },
    { label: "24h change", value: fmtPct(live?.priceChange24h), accent: (live?.priceChange24h ?? 0) >= 0 ? "#26a69a" : "#ef5350" },
    { label: "7d change", value: fmtPct(live?.priceChange7d), accent: (live?.priceChange7d ?? 0) >= 0 ? "#26a69a" : "#ef5350" },
    { label: "30d change", value: fmtPct(live?.priceChange30d), accent: (live?.priceChange30d ?? 0) >= 0 ? "#26a69a" : "#ef5350" },
    { label: "1y change", value: fmtPct(live?.priceChange1y), accent: (live?.priceChange1y ?? 0) >= 0 ? "#26a69a" : "#ef5350" },
    { label: "Circulating", value: fmtNum(live?.circulatingSupply) },
    { label: "Total supply", value: fmtNum(live?.totalSupply) },
    { label: "Max supply", value: fmtNum(live?.maxSupply) },
    { label: "Circ / Max", value: circMax },
    { label: "Rank", value: live?.rank ? `#${live.rank}` : "—" },
    { label: "Holders", value: "N/A", accent: "#5a6072" },
    { label: "Liquidity (24h vol)", value: live?.volume24h ? fmtUsd(live.volume24h) : "—" },
    { label: "Trending", value: live?.trendingScore ?? (live?.rank ? `#${live.rank}` : "—") },
    { label: "Exchanges", value: live?.exchanges?.length ? `${live.exchanges.length} venues` : "—" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 min-w-0">
      {rows.map((row) => (
        <div key={row.label} className="rounded-xl px-3 py-2.5 min-w-0" style={CARD}>
          {loading && !live ? (
            <Skeleton className="h-3 w-16 mb-2" />
          ) : (
            <div className="text-[8px] uppercase tracking-wider font-semibold truncate" style={{ color: "#4a5068" }}>
              {row.label}
            </div>
          )}
          {loading && !live ? (
            <Skeleton className="h-4 w-20" />
          ) : (
            <div
              className="text-[12px] font-mono font-bold truncate mt-0.5"
              style={{ color: row.accent ?? "#fff" }}
            >
              {row.value}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
