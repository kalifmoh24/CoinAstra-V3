import React from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUp, ArrowDown, Zap } from "lucide-react";

interface GlobalData {
  active_cryptocurrencies: number;
  markets: number;
  total_market_cap: { usd: number };
  total_volume: { usd: number };
  market_cap_percentage: { btc: number; eth: number };
  market_cap_change_percentage_24h_usd: number;
}

function fmtLarge(n: number): string {
  if (n >= 1e12) return "$" + (n / 1e12).toFixed(2) + "T";
  if (n >= 1e9)  return "$" + (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6)  return "$" + (n / 1e6).toFixed(2) + "M";
  return "$" + n.toLocaleString();
}

export function GlobalTicker() {
  const { data } = useQuery({
    queryKey: ["cg-global-ticker"],
    queryFn: async () => {
      const res = await fetch("/api/coins/global");
      if (!res.ok) throw new Error("rate-limited");
      return res.json() as Promise<{ data: GlobalData }>;
    },
    refetchInterval: 90_000,
    staleTime: 85_000,
    retry: 1,
  });

  const g = data?.data;
  const mcapChange = g?.market_cap_change_percentage_24h_usd ?? 0;
  const isPos = mcapChange >= 0;

  const sep = (
    <span style={{ color: "rgba(255,255,255,0.1)", margin: "0 2px" }}>|</span>
  );

  return (
    <div
      className="shrink-0 h-7 flex items-center overflow-x-auto overflow-y-hidden select-none"
      style={{
        background: "rgba(5,8,14,1)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        fontSize: "10.5px",
        lineHeight: 1,
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none",
      }}
    >
      <style>{`.ticker-hide::-webkit-scrollbar{display:none}`}</style>
      <div className="ticker-hide flex items-center gap-0 px-3 whitespace-nowrap min-w-full">

        <TickerItem label="Coins" value={g?.active_cryptocurrencies.toLocaleString() ?? "—"} />
        {sep}
        <TickerItem label="Exchanges" value={g?.markets.toLocaleString() ?? "—"} />
        {sep}
        <span className="flex items-center gap-1.5 px-2">
          <span style={{ color: "#4a5068" }}>Market Cap:</span>
          <span className="font-mono font-semibold text-white">
            {g ? fmtLarge(g.total_market_cap.usd) : "—"}
          </span>
          {g && (
            <span className="flex items-center gap-0.5 font-bold"
              style={{ color: isPos ? "#26a69a" : "#ef5350" }}>
              {isPos ? <ArrowUp size={9} /> : <ArrowDown size={9} />}
              {Math.abs(mcapChange).toFixed(1)}%
            </span>
          )}
        </span>
        {sep}
        <TickerItem label="24h Vol" value={g ? fmtLarge(g.total_volume.usd) : "—"} />
        {sep}
        <span className="flex items-center gap-1.5 px-2">
          <span style={{ color: "#4a5068" }}>Dominance:</span>
          <span className="flex items-center gap-2">
            <span className="font-mono font-semibold" style={{ color: "#f7931a" }}>
              BTC {g ? g.market_cap_percentage.btc.toFixed(1) : "—"}%
            </span>
            <span className="font-mono font-semibold" style={{ color: "#627eea" }}>
              ETH {g ? g.market_cap_percentage.eth.toFixed(1) : "—"}%
            </span>
          </span>
        </span>
        {sep}
        <span className="flex items-center gap-1.5 px-2">
          <Zap size={9} style={{ color: "#f7931a" }} />
          <span style={{ color: "#4a5068" }}>Gas:</span>
          <span className="font-mono font-semibold" style={{ color: "#a0a8bc" }}>0.12 GWEI</span>
        </span>
        {sep}
        <span className="flex items-center gap-1.5 px-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#26a69a] animate-pulse inline-block" />
          <span style={{ color: "#26a69a" }} className="font-bold">LIVE</span>
        </span>

      </div>
    </div>
  );
}

function TickerItem({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-center gap-1.5 px-2">
      <span style={{ color: "#4a5068" }}>{label}:</span>
      <span className="font-mono font-semibold text-white">{value}</span>
    </span>
  );
}
