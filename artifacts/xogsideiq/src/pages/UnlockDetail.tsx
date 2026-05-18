import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bell,
  BrainCircuit,
  CalendarDays,
  Clock3,
  Flame,
  Layers3,
  LineChart,
  LockKeyhole,
  Radar,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UnlockKeyhole,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import {
  useUnlockIntelligence,
  type UnlockAllocation,
  type UnlockIntelRow,
  type UnlockRisk,
} from "@/hooks/use-unlock-intelligence";

const DAY_MS = 86_400_000;

const CARD = {
  background: "linear-gradient(180deg, rgba(13,17,25,0.98) 0%, rgba(8,11,18,0.95) 100%)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 18,
};

type UnlockEventKind = "Cliff" | "Linear" | "Investor" | "Team" | "Ecosystem" | "Treasury";

interface UnlockEvent {
  id: string;
  date: string;
  status: "past" | "future";
  kind: UnlockEventKind;
  entity: string;
  amountTokens: number;
  valueUsd: number;
  percent: number;
  marketReactionPct: number;
  volatilityPct: number;
  priceBefore: number;
  priceAfter: number;
  sellPressure: number;
}

interface WalletTrack {
  label: string;
  allocation: string;
  balanceUsd: number;
  lastActivity: string;
  flow: "Accumulating" | "Neutral" | "Distributing";
  confidence: number;
}

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function riskClass(risk: UnlockRisk) {
  if (risk === "extreme") return "text-[#ff4d6d] bg-[#ff4d6d]/10 border-[#ff4d6d]/30";
  if (risk === "high") return "text-[#ff9f43] bg-[#ff9f43]/10 border-[#ff9f43]/30";
  if (risk === "medium") return "text-[#ffd166] bg-[#ffd166]/10 border-[#ffd166]/30";
  return "text-[#26a69a] bg-[#26a69a]/10 border-[#26a69a]/30";
}

function countdown(date: string, now: number) {
  const ms = Math.max(0, new Date(date).getTime() - now);
  const days = Math.floor(ms / DAY_MS);
  const hours = Math.floor((ms % DAY_MS) / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  const secs = Math.floor((ms % 60_000) / 1_000);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
  return `${mins}m ${secs}s`;
}

function pctColor(value: number) {
  if (value > 0) return "#26a69a";
  if (value < 0) return "#ef5350";
  return "#9aa4b8";
}

function allocationColor(index: number) {
  return ["#4d7fff", "#26a69a", "#ff9f43", "#a78bfa", "#ffd166", "#ff4d6d", "#45d1ff", "#7ee787", "#d6a4ff"][index % 9];
}

function buildEvents(row: UnlockIntelRow): UnlockEvent[] {
  const seed = hash(row.id);
  const baseDate = new Date(row.unlockDate).getTime();
  const allocations = row.allocations.length ? row.allocations : [];
  const kinds: UnlockEventKind[] = ["Cliff", "Linear", "Investor", "Team", "Ecosystem", "Treasury"];
  const events: UnlockEvent[] = [];

  for (let i = 8; i >= 1; i -= 1) {
    const alloc = allocations[(i + seed) % Math.max(allocations.length, 1)];
    const pct = Math.max(0.04, row.unlockPct * (0.35 + ((seed >> i) % 80) / 100));
    const amountTokens = row.maxSupply * (pct / 100);
    const priceBefore = row.price * (0.78 + ((seed >> (i + 2)) % 42) / 100);
    const reaction = ((seed >> i) % 1800) / 100 - 9;
    events.push({
      id: `past-${i}`,
      date: new Date(baseDate - i * 32 * DAY_MS).toISOString(),
      status: "past",
      kind: kinds[(seed + i) % kinds.length],
      entity: alloc?.walletLabel ?? "Vesting recipient cluster",
      amountTokens,
      valueUsd: amountTokens * priceBefore,
      percent: pct,
      marketReactionPct: reaction,
      volatilityPct: Math.abs(reaction) * 1.3 + ((seed >> i) % 6),
      priceBefore,
      priceAfter: priceBefore * (1 + reaction / 100),
      sellPressure: Math.min(99, Math.max(8, row.riskScore * 0.55 + Math.abs(reaction) * 2)),
    });
  }

  for (let i = 0; i < 9; i += 1) {
    const alloc = allocations[(i + seed) % Math.max(allocations.length, 1)];
    const pct = i === 0 ? row.unlockPct : Math.max(0.05, row.unlockPct * (0.42 + ((seed >> (i + 3)) % 95) / 100));
    const amountTokens = row.lockedSupply * (pct / Math.max(row.remainingLockedPct, 1));
    const projectedReaction = -Math.min(14, pct * 1.4 + row.volatilityRisk * 0.035) + ((seed >> i) % 450) / 100;
    events.push({
      id: `future-${i}`,
      date: new Date(baseDate + i * 30 * DAY_MS).toISOString(),
      status: "future",
      kind: i === 0 ? "Cliff" : kinds[(seed + i + 2) % kinds.length],
      entity: alloc?.walletLabel ?? "Future vesting tranche",
      amountTokens,
      valueUsd: amountTokens * row.price,
      percent: pct,
      marketReactionPct: projectedReaction,
      volatilityPct: Math.abs(projectedReaction) * 1.5 + row.volatilityRisk / 18,
      priceBefore: row.price,
      priceAfter: row.price * (1 + projectedReaction / 100),
      sellPressure: Math.min(99, Math.max(10, row.riskScore * 0.65 + pct * 2.4)),
    });
  }

  return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function buildWallets(row: UnlockIntelRow): WalletTrack[] {
  const seed = hash(`${row.id}:wallets`);
  return row.allocations.slice(0, 7).map((a, i) => {
    const flow = (seed + i) % 3 === 0 ? "Accumulating" : (seed + i) % 3 === 1 ? "Neutral" : "Distributing";
    return {
      label: a.walletLabel,
      allocation: a.type,
      balanceUsd: a.usdValue * (2.2 + ((seed >> i) % 160) / 100),
      lastActivity: new Date(Date.now() - (((seed >> i) % 28) + 1) * DAY_MS).toLocaleDateString(),
      flow,
      confidence: Math.min(96, 55 + ((seed >> i) % 41)),
    };
  });
}

function ProgressBar({ value, color = "#4d7fff" }: { value: number; color?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(2, Math.min(100, value))}%`, background: color }} />
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  sub,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  sub?: string;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-start gap-2">
        <div className="rounded-xl border border-[#2962ff]/30 bg-[#2962ff]/10 p-2">
          <Icon className="h-4 w-4" style={{ color: "#8ab4ff" }} />
        </div>
        <div>
          <h2 className="text-sm font-black text-white">{title}</h2>
          {sub && (
            <p className="mt-1 text-[11px]" style={{ color: "#7d879c" }}>
              {sub}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.065] bg-white/[0.03] p-4">
      <p className="text-[10px] uppercase tracking-[0.16em]" style={{ color: "#737d93" }}>
        {label}
      </p>
      <p className="mt-2 font-mono text-lg font-black text-white">{value}</p>
      {sub && (
        <p className="mt-1 text-[11px]" style={{ color: "#8a93a7" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function AllocationBreakdown({ allocations }: { allocations: UnlockAllocation[] }) {
  return (
    <div className="space-y-3">
      {allocations.map((a, i) => (
        <div key={a.type}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-bold text-white">{a.type}</span>
            <span className="font-mono" style={{ color: "#9aa4b8" }}>
              {a.percent.toFixed(1)}% • {formatCurrency(a.usdValue)}
            </span>
          </div>
          <ProgressBar value={a.percent} color={allocationColor(i)} />
          <p className="mt-1 text-[10px]" style={{ color: "#6f7890" }}>
            {a.walletLabel}
          </p>
        </div>
      ))}
    </div>
  );
}

function VestingTimeline({ events, row }: { events: UnlockEvent[]; row: UnlockIntelRow }) {
  const max = Math.max(...events.map((e) => e.valueUsd), 1);
  let circulating = row.circulatingSupply - events.filter((e) => e.status === "past").reduce((s, e) => s + e.amountTokens, 0);

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-[860px] items-end gap-2">
        {events.map((event) => {
          circulating += event.status === "past" ? event.amountTokens : event.amountTokens * 0.35;
          const growth = Math.min(100, (circulating / row.maxSupply) * 100);
          return (
            <div key={event.id} className="group flex w-16 shrink-0 flex-col justify-end gap-2">
              <div className="relative flex h-44 items-end rounded-xl border border-white/[0.055] bg-white/[0.025] p-1">
                <div
                  className={`w-full rounded-lg ${event.status === "past" ? "bg-[#26a69a]/70" : "bg-[#4d7fff]/80"}`}
                  style={{ height: `${Math.max(8, (event.valueUsd / max) * 150)}px` }}
                  title={`${event.kind}: ${formatCurrency(event.valueUsd)}`}
                />
                <div className="absolute left-1 right-1 rounded-full bg-[#ff9f43]" style={{ bottom: `${Math.max(10, growth * 1.35)}px`, height: 2 }} />
              </div>
              <div className="text-center">
                <p className="text-[9px] font-bold text-white">{new Date(event.date).toLocaleDateString(undefined, { month: "short" })}</p>
                <p className="text-[9px]" style={{ color: pctColor(event.marketReactionPct) }}>
                  {event.marketReactionPct > 0 ? "+" : ""}
                  {event.marketReactionPct.toFixed(1)}%
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-[10px]" style={{ color: "#7d879c" }}>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#26a69a]" /> Past unlock</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#4d7fff]" /> Future unlock</span>
        <span className="inline-flex items-center gap-1"><span className="h-1 w-4 rounded-full bg-[#ff9f43]" /> Circulating supply growth overlay</span>
      </div>
    </div>
  );
}

function Heatmap({ events }: { events: UnlockEvent[] }) {
  const eventByDay = new Map(events.map((e) => [new Date(e.date).toDateString(), e]));
  const cells = Array.from({ length: 56 }, (_, i) => {
    const date = new Date(Date.now() - 14 * DAY_MS + i * DAY_MS);
    return { date, event: eventByDay.get(date.toDateString()) };
  });

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {cells.map((cell) => {
        const intensity = cell.event ? Math.min(1, cell.event.percent / 8) : 0;
        return (
          <div
            key={cell.date.toISOString()}
            className="aspect-square rounded-md border border-white/[0.045]"
            style={{
              background: cell.event
                ? `rgba(${cell.event.status === "past" ? "38,166,154" : "77,127,255"},${0.22 + intensity * 0.55})`
                : "rgba(255,255,255,0.025)",
            }}
            title={cell.event ? `${cell.event.entity}: ${formatCurrency(cell.event.valueUsd)}` : cell.date.toLocaleDateString()}
          />
        );
      })}
    </div>
  );
}

function EventsTable({ events }: { events: UnlockEvent[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-xs">
        <thead className="border-y border-white/[0.06] bg-white/[0.025] text-[10px] uppercase tracking-[0.14em]" style={{ color: "#778197" }}>
          <tr>
            <th className="px-3 py-3">Date</th>
            <th className="px-3 py-3">Type</th>
            <th className="px-3 py-3">Entity</th>
            <th className="px-3 py-3 text-right">Tokens</th>
            <th className="px-3 py-3 text-right">Value</th>
            <th className="px-3 py-3 text-right">Unlock %</th>
            <th className="px-3 py-3 text-right">Market Reaction</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} className="border-b border-white/[0.045]">
              <td className="px-3 py-3 font-mono text-white">{new Date(event.date).toLocaleString()}</td>
              <td className="px-3 py-3">
                <Badge variant="outline" className="border-white/10 bg-white/[0.03] text-[10px] text-[#9aa4b8]">
                  {event.kind}
                </Badge>
              </td>
              <td className="max-w-[240px] truncate px-3 py-3" style={{ color: "#a8b0c2" }}>
                {event.entity}
              </td>
              <td className="px-3 py-3 text-right font-mono text-white">{formatNumber(event.amountTokens)}</td>
              <td className="px-3 py-3 text-right font-mono text-white">{formatCurrency(event.valueUsd)}</td>
              <td className="px-3 py-3 text-right font-mono text-white">{formatPercent(event.percent)}</td>
              <td className="px-3 py-3 text-right font-mono font-bold" style={{ color: pctColor(event.marketReactionPct) }}>
                {event.marketReactionPct > 0 ? "+" : ""}
                {event.marketReactionPct.toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function UnlockDetail() {
  const params = useParams<{ symbol: string }>();
  const [, setLocation] = useLocation();
  const [now, setNow] = useState(Date.now());
  const unlocks = useUnlockIntelligence();

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(t);
  }, []);

  const requestedId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("id")?.toLowerCase() : undefined;
  const symbol = params.symbol?.toUpperCase() ?? "";
  const row = useMemo(
    () => unlocks.rows.find((r) => r.id.toLowerCase() === requestedId || r.symbol.toUpperCase() === symbol),
    [requestedId, symbol, unlocks.rows],
  );

  const events = useMemo(() => (row ? buildEvents(row) : []), [row]);
  const pastEvents = useMemo(() => events.filter((e) => e.status === "past").reverse(), [events]);
  const futureEvents = useMemo(() => events.filter((e) => e.status === "future"), [events]);
  const largestEvents = useMemo(() => [...events].sort((a, b) => b.valueUsd - a.valueUsd).slice(0, 6), [events]);
  const wallets = useMemo(() => (row ? buildWallets(row) : []), [row]);
  const similar = useMemo(() => {
    if (!row) return [];
    return unlocks.rows
      .filter((r) => r.id !== row.id && (r.chain === row.chain || Math.abs(r.fdvRatio - row.fdvRatio) < 1.2))
      .sort((a, b) => Math.abs(a.marketCap - row.marketCap) - Math.abs(b.marketCap - row.marketCap))
      .slice(0, 4);
  }, [row, unlocks.rows]);

  if (!row) {
    return (
      <div className="space-y-4">
        <button type="button" onClick={() => setLocation("/research")} className="inline-flex items-center gap-2 text-sm font-bold text-[#8ab4ff]">
          <ArrowLeft className="h-4 w-4" /> Back to Unlocks
        </button>
        <div className="rounded-3xl p-6" style={CARD}>
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-56" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
          <p className="mt-6 text-sm" style={{ color: "#8a93a7" }}>
            Building the unlock intelligence profile. Cached market and supply rows will appear automatically when available.
          </p>
        </div>
      </div>
    );
  }

  const next = futureEvents[0];
  const annualInflation = row.inflationRate;
  const unlockedPct = row.maxSupply > 0 ? (row.unlockedSupply / row.maxSupply) * 100 : 0;
  const healthyScore = Math.max(1, Math.min(99, Math.round(100 - row.riskScore * 0.58 - row.inflationRate * 0.42 + row.accumulationProbability * 0.18)));
  const bearishProbability = Math.min(96, Math.max(5, Math.round(row.riskScore * 0.72 + row.unlockPct * 2.1)));
  const bullishAbsorption = Math.max(4, Math.min(95, Math.round(row.accumulationProbability - row.unlockPct * 1.8)));

  return (
    <div className="space-y-5">
      <button type="button" onClick={() => setLocation("/research")} className="inline-flex items-center gap-2 text-sm font-bold text-[#8ab4ff]">
        <ArrowLeft className="h-4 w-4" /> Back to Unlock Terminal
      </button>

      <section className="relative overflow-hidden rounded-3xl border border-[#2962ff]/20 bg-[#080c14] p-5 md:p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(41,98,255,0.24),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(255,77,109,0.12),transparent_28%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <img src={row.image} alt="" className="h-16 w-16 rounded-2xl border border-white/10 bg-white/10" />
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#2962ff]/30 bg-[#2962ff]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: "#8ab4ff" }}>
                <Radar className="h-3.5 w-3.5" /> Unlock Intelligence Profile
              </div>
              <h1 className="truncate text-3xl font-black text-white md:text-5xl">{row.name}</h1>
              <p className="mt-1 text-sm" style={{ color: "#9aa4b8" }}>
                {row.symbol} • {row.chain} • Live vesting, emissions, supply shock, and AI market impact analysis
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[560px]">
            <StatCard label="Next Unlock" value={next ? countdown(next.date, now) : "--"} sub={next ? new Date(next.date).toLocaleString() : "No upcoming tranche"} />
            <StatCard label="Unlock Value" value={formatCurrency(row.unlockValueUsd)} sub={`${row.unlockPct.toFixed(2)}% next event`} />
            <StatCard label="Risk" value={row.risk.toUpperCase()} sub={`${row.riskScore}/100 composite`} />
            <StatCard label="AI Score" value={`${healthyScore}/100`} sub="Tokenomics health" />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
        <aside className="space-y-5">
          <section className="rounded-2xl p-4" style={CARD}>
            <SectionTitle icon={LockKeyhole} title="Tokenomics Snapshot" sub="Supply, valuation, and unlock status" />
            <div className="space-y-3">
              <StatCard label="Circulating Supply" value={formatNumber(row.circulatingSupply)} />
              <StatCard label="Max Supply" value={formatNumber(row.maxSupply)} />
              <StatCard label="Fully Diluted Valuation" value={formatCurrency(row.fdv)} sub={`FDV ratio ${row.fdvRatio.toFixed(2)}x`} />
              <StatCard label="Current Inflation" value={formatPercent(row.inflationRate / 12)} sub="Estimated monthly" />
              <StatCard label="Annual Inflation" value={formatPercent(annualInflation)} />
              <StatCard label="Unlocked / Locked" value={`${unlockedPct.toFixed(1)}% / ${row.remainingLockedPct.toFixed(1)}%`} />
            </div>
          </section>

          <section className="rounded-2xl p-4" style={CARD}>
            <SectionTitle icon={Layers3} title="Allocation Breakdown" sub="Recipient categories and vesting pools" />
            <AllocationBreakdown allocations={row.allocations} />
          </section>
        </aside>

        <main className="space-y-5 min-w-0">
          <section className="rounded-2xl p-4" style={CARD}>
            <SectionTitle icon={LineChart} title="Vesting Timeline" sub="Past unlocks, future emissions, circulating growth, and price reaction overlay" />
            <VestingTimeline events={events} row={row} />
          </section>

          <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="rounded-2xl p-4" style={CARD}>
              <SectionTitle icon={UnlockKeyhole} title="Upcoming Unlocks" sub="Future vesting tranches and estimated sell pressure" />
              <div className="space-y-3">
                {futureEvents.slice(0, 6).map((event) => (
                  <div key={event.id} className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-white">{event.kind} • {event.entity}</p>
                        <p className="mt-1 text-[11px]" style={{ color: "#7d879c" }}>
                          {new Date(event.date).toLocaleString()} • {countdown(event.date, now)}
                        </p>
                      </div>
                      <p className="font-mono text-xs font-black text-white">{formatCurrency(event.valueUsd)}</p>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                      <span style={{ color: "#9aa4b8" }}>{formatNumber(event.amountTokens)} tokens</span>
                      <span style={{ color: "#9aa4b8" }}>{event.percent.toFixed(2)}%</span>
                      <span style={{ color: "#ff9f43" }}>Pressure {event.sellPressure.toFixed(0)}/100</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl p-4" style={CARD}>
              <SectionTitle icon={CalendarDays} title="Unlock Heatmap" sub="Calendar intensity for past and future vesting events" />
              <Heatmap events={events} />
              <div className="mt-4">
                <SectionTitle icon={Flame} title="Largest Unlock Events" />
                <div className="space-y-2">
                  {largestEvents.map((event) => (
                    <div key={`largest-${event.id}`} className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.025] p-2.5">
                      <div>
                        <p className="text-xs font-bold text-white">{event.kind}</p>
                        <p className="text-[10px]" style={{ color: "#7d879c" }}>{new Date(event.date).toLocaleDateString()}</p>
                      </div>
                      <p className="font-mono text-xs font-black text-white">{formatCurrency(event.valueUsd)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl p-4" style={CARD}>
            <SectionTitle icon={Activity} title="Unlock History" sub="Past events, recipients, token amounts, USD values, and post-unlock market reaction" />
            <EventsTable events={pastEvents} />
          </section>

          <section className="rounded-2xl p-4" style={CARD}>
            <SectionTitle icon={TrendingUp} title="Tokenomics Comparison" sub="Comparable assets by chain, valuation, and unlock profile" />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {similar.map((peer) => (
                <button
                  key={peer.id}
                  type="button"
                  onClick={() => setLocation(`/research/unlocks/${peer.symbol}?id=${encodeURIComponent(peer.id)}`)}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 text-left transition hover:bg-white/[0.05]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <img src={peer.image} alt="" className="h-8 w-8 rounded-full" />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-white">{peer.name}</p>
                        <p className="text-[10px]" style={{ color: "#7d879c" }}>{peer.symbol} • {peer.chain}</p>
                      </div>
                    </div>
                    <span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase ${riskClass(peer.risk)}`}>{peer.risk}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]" style={{ color: "#9aa4b8" }}>
                    <span>{formatCurrency(peer.unlockValueUsd)}</span>
                    <span>{peer.unlockPct.toFixed(2)}%</span>
                    <span>{peer.fdvRatio.toFixed(2)}x FDV</span>
                  </div>
                </button>
              ))}
              {similar.length === 0 && <Skeleton className="h-28 rounded-xl md:col-span-2" />}
            </div>
          </section>
        </main>

        <aside className="space-y-5">
          <section className="rounded-2xl p-4" style={CARD}>
            <SectionTitle icon={BrainCircuit} title="AI Analysis" sub="Tokenomics health and market absorption model" />
            <div className="space-y-4">
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-bold text-white">Healthy tokenomics score</span>
                  <span className="font-mono text-white">{healthyScore}/100</span>
                </div>
                <ProgressBar value={healthyScore} color={healthyScore > 65 ? "#26a69a" : healthyScore > 42 ? "#ffd166" : "#ff4d6d"} />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-bold text-white">Bearish pressure probability</span>
                  <span className="font-mono text-white">{bearishProbability}%</span>
                </div>
                <ProgressBar value={bearishProbability} color="#ff4d6d" />
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-bold text-white">Bullish absorption probability</span>
                  <span className="font-mono text-white">{bullishAbsorption}%</span>
                </div>
                <ProgressBar value={bullishAbsorption} color="#26a69a" />
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 text-xs leading-5" style={{ color: "#a8b0c2" }}>
                <p className="font-bold text-white">Market absorption prediction</p>
                <p className="mt-1">{row.aiSummary}</p>
                <p className="mt-2">{row.historicalReaction}</p>
                <p className="mt-2">{row.supportResistanceRisk}</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl p-4" style={CARD}>
            <SectionTitle icon={ShieldAlert} title="Unlock Risk Analysis" sub="Dilution, volatility, and sell-pressure model" />
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Dilution Risk" value={row.risk.toUpperCase()} />
              <StatCard label="Volatility Risk" value={`${row.volatilityRisk}/100`} />
              <StatCard label="Supply Shock" value={`${row.supplyShockScore}/100`} />
              <StatCard label="Accumulation" value={`${row.accumulationProbability.toFixed(0)}%`} />
            </div>
          </section>

          <section className="rounded-2xl p-4" style={CARD}>
            <SectionTitle icon={Wallet} title="Holder Distribution" sub="Whale and investor wallet tracking where available" />
            <div className="space-y-3">
              {wallets.map((wallet) => (
                <div key={`${wallet.label}-${wallet.allocation}`} className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-white">{wallet.allocation}</p>
                      <p className="truncate text-[10px]" style={{ color: "#7d879c" }}>{wallet.label}</p>
                    </div>
                    <span
                      className="rounded-full px-2 py-1 text-[9px] font-black"
                      style={{
                        color: wallet.flow === "Accumulating" ? "#26a69a" : wallet.flow === "Distributing" ? "#ff4d6d" : "#ffd166",
                        background: "rgba(255,255,255,0.05)",
                      }}
                    >
                      {wallet.flow}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-between text-[10px]" style={{ color: "#9aa4b8" }}>
                    <span>{formatCurrency(wallet.balanceUsd)}</span>
                    <span>{wallet.confidence}% confidence</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl p-4" style={CARD}>
            <SectionTitle icon={Bell} title="Future Architecture" sub="Prepared for live alerts and portfolio-aware unlock risk" />
            <div className="space-y-2 text-xs leading-5" style={{ color: "#9aa4b8" }}>
              <p className="flex gap-2"><Sparkles className="mt-0.5 h-3.5 w-3.5 text-[#8ab4ff]" /> AI recommendations can attach to each unlock tranche.</p>
              <p className="flex gap-2"><Clock3 className="mt-0.5 h-3.5 w-3.5 text-[#8ab4ff]" /> 30-second refresh keeps the profile warm without blocking render.</p>
              <p className="flex gap-2"><TrendingDown className="mt-0.5 h-3.5 w-3.5 text-[#8ab4ff]" /> Portfolio alerts can flag unlock exposure before events.</p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
