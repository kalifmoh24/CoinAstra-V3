import React, { useMemo, useRef, useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  AlertTriangle,
  Bell,
  BrainCircuit,
  CalendarClock,
  ChevronRight,
  Filter,
  Flame,
  Layers3,
  LineChart,
  Loader2,
  Radar,
  Search,
  ShieldAlert,
  Sparkles,
  UnlockKeyhole,
  Wallet,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { VirtualCoinList } from "@/components/virtual-coin-list";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  useUnlockIntelligence,
  type UnlockCategory,
  type UnlockIntelRow,
  type UnlockRisk,
} from "@/hooks/use-unlock-intelligence";

const CARD = {
  background: "linear-gradient(180deg, rgba(13,17,25,0.98) 0%, rgba(8,11,18,0.94) 100%)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 18,
};

const CATEGORY_OPTIONS: { id: UnlockCategory | "all"; label: string }[] = [
  { id: "all", label: "All Unlocks" },
  { id: "today", label: "Today" },
  { id: "7d", label: "7 Days" },
  { id: "30d", label: "30 Days" },
  { id: "90d", label: "90 Days" },
  { id: "large", label: "Large Unlocks" },
  { id: "vc", label: "VC Unlocks" },
  { id: "team", label: "Team Unlocks" },
  { id: "ecosystem", label: "Ecosystem" },
  { id: "airdrop", label: "Airdrop" },
];

const SORT_OPTIONS = [
  { id: "unlockValue", label: "Unlock Value" },
  { id: "percentage", label: "Unlock %" },
  { id: "countdown", label: "Countdown" },
  { id: "volatility", label: "Volatility Risk" },
  { id: "marketCap", label: "Market Cap" },
  { id: "fdvRatio", label: "FDV Ratio" },
] as const;

type SortId = (typeof SORT_OPTIONS)[number]["id"];
type RiskFilter = UnlockRisk | "all";

function msUntil(date: string, now: number) {
  return Math.max(0, new Date(date).getTime() - now);
}

function formatCountdown(date: string, now: number): string {
  const ms = msUntil(date, now);
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function riskClass(risk: UnlockRisk) {
  if (risk === "extreme") return "text-[#ff4d6d] bg-[#ff4d6d]/10 border-[#ff4d6d]/30";
  if (risk === "high") return "text-[#ff9f43] bg-[#ff9f43]/10 border-[#ff9f43]/30";
  if (risk === "medium") return "text-[#ffd166] bg-[#ffd166]/10 border-[#ffd166]/30";
  return "text-[#26a69a] bg-[#26a69a]/10 border-[#26a69a]/30";
}

function ProgressBar({ value, color = "#4d7fff" }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
      <div className="h-full rounded-full" style={{ width: `${Math.max(2, Math.min(100, value))}%`, background: color }} />
    </div>
  );
}

function MiniTimeline({ row }: { row: UnlockIntelRow }) {
  const max = Math.max(...row.timeline.map((p) => p.valueUsd), 1);
  return (
    <div className="flex h-14 items-end gap-1.5">
      {row.timeline.map((p) => (
        <div key={p.label} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="w-full rounded-t-md bg-gradient-to-t from-[#2962ff] to-[#6aa7ff]"
            style={{ height: `${Math.max(12, (p.valueUsd / max) * 44)}px`, opacity: p.label === "Unlock" ? 1 : 0.5 }}
            title={`${p.label}: ${formatCurrency(p.valueUsd)}`}
          />
          <span className="text-[9px] text-[#697386]">{p.label}</span>
        </div>
      ))}
    </div>
  );
}

function StatTile({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}) {
  return (
    <div className="rounded-2xl p-4" style={CARD}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "#6f7890" }}>
            {label}
          </p>
          <p className="mt-2 text-2xl font-black text-white">{value}</p>
          <p className="mt-1 text-[11px]" style={{ color: "#8a93a7" }}>
            {sub}
          </p>
        </div>
        <div className="rounded-xl border border-[#2962ff]/30 bg-[#2962ff]/10 p-2">
          <Icon className="h-4 w-4" style={{ color: "#8ab4ff" }} />
        </div>
      </div>
    </div>
  );
}

function InsightCard({
  title,
  rows,
  icon: Icon,
}: {
  title: string;
  rows: UnlockIntelRow[];
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}) {
  return (
    <div className="rounded-2xl p-4" style={CARD}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" style={{ color: "#4d7fff" }} />
          <h3 className="text-sm font-bold text-white">{title}</h3>
        </div>
        <ChevronRight className="h-4 w-4" style={{ color: "#596274" }} />
      </div>
      <div className="space-y-3">
        {rows.slice(0, 4).map((row) => (
          <div key={`${title}-${row.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.025] p-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <img src={row.image} alt="" className="h-8 w-8 rounded-full bg-white/10" />
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-white">{row.name}</p>
                <p className="text-[10px]" style={{ color: "#747e92" }}>
                  {row.symbol} • {formatCountdown(row.unlockDate, Date.now())}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-mono text-xs font-bold text-white">{formatCurrency(row.unlockValueUsd)}</p>
              <p className={`text-[10px] font-bold capitalize ${riskClass(row.risk).split(" ")[0]}`}>{row.risk} risk</p>
            </div>
          </div>
        ))}
        {rows.length === 0 && <Skeleton className="h-28 w-full rounded-xl" />}
      </div>
    </div>
  );
}

function AllocationPills({ row }: { row: UnlockIntelRow }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {row.allocations.slice(0, 4).map((a) => (
        <span key={a.type} className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px]" style={{ color: "#9aa4b8" }}>
          {a.type} {a.percent.toFixed(0)}%
        </span>
      ))}
    </div>
  );
}

function UnlockRow({
  row,
  now,
  onOpen,
}: {
  row: UnlockIntelRow;
  now: number;
  onOpen: (row: UnlockIntelRow) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(row)}
      className="grid h-full w-full grid-cols-[minmax(260px,1.4fr)_0.8fr_0.8fr_0.85fr_0.85fr_1fr_0.9fr] items-center gap-4 border-b border-white/[0.055] px-4 text-left transition hover:bg-[#121a2a] max-lg:grid-cols-[minmax(220px,1fr)_0.8fr_0.8fr_0.8fr] max-md:hidden"
    >
      <div className="flex min-w-0 items-center gap-3">
        <img src={row.image} alt="" className="h-9 w-9 rounded-full bg-white/10" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-bold text-white">{row.name}</p>
            <Badge variant="outline" className="border-white/10 bg-white/[0.03] text-[10px] text-[#8a93a7]">
              {row.source === "provider" ? "Live API" : "Derived"}
            </Badge>
          </div>
          <p className="text-[11px]" style={{ color: "#737d93" }}>
            {row.symbol} • {row.chain} • {formatCurrency(row.price)}
          </p>
        </div>
      </div>
      <div className="font-mono text-xs text-white">
        <p className="font-bold">{formatCurrency(row.unlockValueUsd)}</p>
        <p className="text-[10px]" style={{ color: "#717b91" }}>
          {row.unlockPct.toFixed(2)}% unlock
        </p>
      </div>
      <div>
        <p className="font-mono text-xs font-bold text-white">{formatCountdown(row.unlockDate, now)}</p>
        <p className="text-[10px]" style={{ color: "#717b91" }}>
          {new Date(row.unlockDate).toLocaleDateString()}
        </p>
      </div>
      <div className="max-lg:hidden">
        <p className="font-mono text-xs text-white">{formatCurrency(row.marketCap)}</p>
        <p className="text-[10px]" style={{ color: "#717b91" }}>
          FDV {row.fdvRatio.toFixed(2)}x
        </p>
      </div>
      <div className="max-lg:hidden">
        <p className="font-mono text-xs text-white">{formatPercent(row.remainingLockedPct)}</p>
        <p className="text-[10px]" style={{ color: "#717b91" }}>
          {formatNumber(row.lockedSupply)} locked
        </p>
      </div>
      <div className="max-lg:hidden">
        <MiniTimeline row={row} />
      </div>
      <div>
        <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-black uppercase ${riskClass(row.risk)}`}>
          {row.risk}
        </span>
        <p className="mt-1 text-[10px]" style={{ color: "#717b91" }}>
          Vol {row.volatilityRisk}/100
        </p>
      </div>
    </button>
  );
}

function MobileUnlockCard({ row, now, onOpen }: { row: UnlockIntelRow; now: number; onOpen: (row: UnlockIntelRow) => void }) {
  return (
    <button type="button" onClick={() => onOpen(row)} className="w-full rounded-2xl p-4 text-left md:hidden" style={CARD}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <img src={row.image} alt="" className="h-10 w-10 rounded-full bg-white/10" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{row.name}</p>
            <p className="text-[11px]" style={{ color: "#747e92" }}>
              {row.symbol} • {row.chain}
            </p>
          </div>
        </div>
        <span className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase ${riskClass(row.risk)}`}>{row.risk}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div>
          <p style={{ color: "#707a90" }}>Unlock Value</p>
          <p className="font-mono font-bold text-white">{formatCurrency(row.unlockValueUsd)}</p>
        </div>
        <div>
          <p style={{ color: "#707a90" }}>Countdown</p>
          <p className="font-mono font-bold text-white">{formatCountdown(row.unlockDate, now)}</p>
        </div>
        <div>
          <p style={{ color: "#707a90" }}>Locked</p>
          <p className="font-mono font-bold text-white">{formatPercent(row.remainingLockedPct)}</p>
        </div>
        <div>
          <p style={{ color: "#707a90" }}>Inflation</p>
          <p className="font-mono font-bold text-white">{formatPercent(row.inflationRate)}</p>
        </div>
      </div>
      <div className="mt-4">
        <MiniTimeline row={row} />
      </div>
    </button>
  );
}

export default function Research() {
  const [, setLocation] = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<UnlockCategory | "all">("all");
  const [risk, setRisk] = useState<RiskFilter>("all");
  const [sortBy, setSortBy] = useState<SortId>("unlockValue");
  const [minUnlockUsd, setMinUnlockUsd] = useState("0");
  const [chain, setChain] = useState("all");
  const [now, setNow] = useState(Date.now());
  const debounced = useDebouncedValue(search.trim(), 280);
  const unlocks = useUnlockIntelligence();

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(t);
  }, []);

  const chains = useMemo(() => ["all", ...Array.from(new Set(unlocks.rows.map((r) => r.chain))).sort()], [unlocks.rows]);

  const rows = useMemo(() => {
    const q = debounced.toLowerCase();
    const minUsd = Number(minUnlockUsd || 0);
    const filtered = unlocks.rows.filter((row) => {
      if (q && !row.name.toLowerCase().includes(q) && !row.symbol.toLowerCase().includes(q) && !row.id.toLowerCase().includes(q)) return false;
      if (category !== "all" && !row.categories.includes(category)) return false;
      if (risk !== "all" && row.risk !== risk) return false;
      if (chain !== "all" && row.chain !== chain) return false;
      if (Number.isFinite(minUsd) && row.unlockValueUsd < minUsd) return false;
      return true;
    });
    return [...filtered].sort((a, b) => {
      if (sortBy === "unlockValue") return b.unlockValueUsd - a.unlockValueUsd;
      if (sortBy === "percentage") return b.unlockPct - a.unlockPct;
      if (sortBy === "countdown") return new Date(a.unlockDate).getTime() - new Date(b.unlockDate).getTime();
      if (sortBy === "volatility") return b.volatilityRisk - a.volatilityRisk;
      if (sortBy === "marketCap") return b.marketCap - a.marketCap;
      return b.fdvRatio - a.fdvRatio;
    });
  }, [category, chain, debounced, minUnlockUsd, risk, sortBy, unlocks.rows]);

  const biggest = useMemo(() => [...unlocks.rows].sort((a, b) => b.unlockValueUsd - a.unlockValueUsd).slice(0, 4), [unlocks.rows]);
  const highestRisk = useMemo(() => [...unlocks.rows].sort((a, b) => b.riskScore - a.riskScore).slice(0, 4), [unlocks.rows]);
  const bullish = useMemo(
    () => unlocks.rows.filter((r) => r.accumulationProbability >= 58 && r.risk !== "extreme").sort((a, b) => b.accumulationProbability - a.accumulationProbability).slice(0, 4),
    [unlocks.rows],
  );
  const smartMoney = useMemo(
    () => unlocks.rows.filter((r) => r.unlockPct < 4 && r.remainingLockedPct > 15).sort((a, b) => b.marketCap - a.marketCap).slice(0, 4),
    [unlocks.rows],
  );
  const totalUnlockValue = useMemo(() => rows.reduce((sum, r) => sum + r.unlockValueUsd, 0), [rows]);
  const extremeCount = useMemo(() => rows.filter((r) => r.risk === "extreme").length, [rows]);
  const nextUnlock = rows[0];

  const openRow = (row: UnlockIntelRow) => setLocation(`/research/unlocks/${row.symbol}?id=${encodeURIComponent(row.id)}`);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-[#2962ff]/20 bg-[#080c14] p-5 md:p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(41,98,255,0.24),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(38,166,154,0.12),transparent_28%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#2962ff]/30 bg-[#2962ff]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#8ab4ff" }}>
              <Radar className="h-3.5 w-3.5" /> Crypto Unlocks & Vesting Intelligence
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white md:text-5xl">Tokenomics Intelligence Terminal</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6" style={{ color: "#9aa4b8" }}>
              Track locked supply, vesting schedules, cliff unlocks, emissions, dilution pressure, and AI unlock impact across live market data with a provider-ready unlock feed.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 lg:w-[520px]">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <p style={{ color: "#798398" }}>Coverage</p>
              <p className="mt-1 text-xl font-black text-white">{unlocks.rows.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <p style={{ color: "#798398" }}>Unlock Value</p>
              <p className="mt-1 text-xl font-black text-white">{formatCurrency(totalUnlockValue)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <p style={{ color: "#798398" }}>Extreme Risk</p>
              <p className="mt-1 text-xl font-black text-[#ff4d6d]">{extremeCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <p style={{ color: "#798398" }}>Refresh</p>
              <p className="mt-1 flex items-center gap-1 text-xl font-black text-white">
                {unlocks.isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : "30s"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={CalendarClock} label="Next Unlock" value={nextUnlock ? formatCountdown(nextUnlock.unlockDate, now) : "--"} sub={nextUnlock ? `${nextUnlock.name} • ${formatCurrency(nextUnlock.unlockValueUsd)}` : "Waiting for feed"} />
        <StatTile icon={UnlockKeyhole} label="Locked Supply" value={formatNumber(rows.reduce((s, r) => s + r.lockedSupply, 0))} sub="Aggregate filtered locked float" />
        <StatTile icon={Flame} label="Monthly Emissions" value={formatCurrency(rows.reduce((s, r) => s + r.monthlyEmissionUsd, 0))} sub="Projected release pressure" />
        <StatTile icon={BrainCircuit} label="AI Risk Models" value={`${rows.filter((r) => r.risk === "high" || r.risk === "extreme").length}`} sub="High-risk unlock setups" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <InsightCard title="Biggest Upcoming Unlocks" rows={biggest} icon={UnlockKeyhole} />
        <InsightCard title="Highest Dilution Risk" rows={highestRisk} icon={ShieldAlert} />
        <InsightCard title="AI Bullish Despite Unlock" rows={bullish} icon={Sparkles} />
        <InsightCard title="Smart Money Accumulation" rows={smartMoney} icon={Wallet} />
      </div>

      <section className="rounded-2xl p-4" style={CARD}>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" style={{ color: "#4d7fff" }} />
              <h2 className="text-lg font-black text-white">Unlock Screener</h2>
            </div>
            <p className="mt-1 text-xs" style={{ color: "#7d879c" }}>
              Sort by unlock value, percentage, countdown, volatility risk, market cap, and FDV ratio. Rows open the detailed token page.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[#26a69a]/20 bg-[#26a69a]/10 px-3 py-1.5 text-[11px] font-bold" style={{ color: "#7ee0d2" }}>
            <Bell className="h-3.5 w-3.5" />
            Alerts, portfolio tracking, and websocket updates ready via provider layer
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          <div className="relative xl:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "#6f7890" }} />
            <Input
              placeholder="Search token, ticker, or asset id..."
              className="h-11 border-white/10 bg-white/[0.035] pl-9 text-white placeholder:text-[#626b7e]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="h-11 rounded-md border border-white/10 bg-[#0d1119] px-3 text-sm text-white" value={category} onChange={(e) => setCategory(e.target.value as UnlockCategory | "all")}>
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <select className="h-11 rounded-md border border-white/10 bg-[#0d1119] px-3 text-sm text-white" value={risk} onChange={(e) => setRisk(e.target.value as RiskFilter)}>
            <option value="all">All Dilution Risk</option>
            <option value="low">Low Sell Pressure</option>
            <option value="medium">Medium Sell Pressure</option>
            <option value="high">High Sell Pressure</option>
            <option value="extreme">Extreme Dilution</option>
          </select>
          <select className="h-11 rounded-md border border-white/10 bg-[#0d1119] px-3 text-sm text-white" value={chain} onChange={(e) => setChain(e.target.value)}>
            {chains.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? "All Blockchains" : c}
              </option>
            ))}
          </select>
          <select className="h-11 rounded-md border border-white/10 bg-[#0d1119] px-3 text-sm text-white" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortId)}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                Sort: {o.label}
              </option>
            ))}
          </select>
          <Input
            type="number"
            min="0"
            placeholder="Min unlock USD"
            className="h-11 border-white/10 bg-white/[0.035] text-white placeholder:text-[#626b7e] xl:col-start-6"
            value={minUnlockUsd}
            onChange={(e) => setMinUnlockUsd(e.target.value)}
          />
        </div>

        <div className="mt-4 hidden grid-cols-[minmax(260px,1.4fr)_0.8fr_0.8fr_0.85fr_0.85fr_1fr_0.9fr] gap-4 border-y border-white/[0.06] bg-white/[0.025] px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] max-lg:grid-cols-[minmax(220px,1fr)_0.8fr_0.8fr_0.8fr] md:grid" style={{ color: "#778197" }}>
          <span>Asset / Source</span>
          <span>Unlock Value</span>
          <span>Countdown</span>
          <span className="max-lg:hidden">Market Cap / FDV</span>
          <span className="max-lg:hidden">Supply Locked</span>
          <span className="max-lg:hidden">Emission Curve</span>
          <span>Risk</span>
        </div>

        {unlocks.isLoading ? (
          <div className="space-y-3 py-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <AlertTriangle className="h-8 w-8" style={{ color: "#ff9f43" }} />
            <p className="text-sm font-bold text-white">No unlock rows match the active filters.</p>
            <p className="max-w-md text-xs" style={{ color: "#7d879c" }}>
              Clear filters or lower the minimum unlock value. Cached rows remain available when the live market feed is rate-limited.
            </p>
          </div>
        ) : (
          <>
            <div ref={scrollRef} className="hidden max-h-[680px] overflow-auto md:block">
              <VirtualCoinList
                items={rows}
                rowHeight={88}
                scrollParentRef={scrollRef}
                renderRow={(row) => <UnlockRow row={row} now={now} onOpen={openRow} />}
              />
            </div>
            <div className="mt-4 space-y-3 md:hidden">
              {rows.slice(0, 60).map((row) => (
                <MobileUnlockCard key={row.id} row={row} now={now} onOpen={openRow} />
              ))}
            </div>
          </>
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl p-4" style={CARD}>
          <div className="mb-4 flex items-center gap-2">
            <LineChart className="h-4 w-4" style={{ color: "#4d7fff" }} />
            <h2 className="text-sm font-black text-white">Visual Unlock Timeline & Supply Shock</h2>
          </div>
          <div className="grid grid-cols-6 items-end gap-2">
            {rows.slice(0, 18).map((row) => (
              <div key={`timeline-${row.id}`} className="group flex min-h-48 flex-col justify-end gap-2 rounded-xl border border-white/[0.06] bg-white/[0.025] p-2">
                <div
                  className="rounded-t-lg bg-gradient-to-t from-[#2962ff] via-[#4d7fff] to-[#9cc2ff]"
                  style={{ height: `${Math.max(18, Math.min(160, row.supplyShockScore * 1.6))}px` }}
                  title={`${row.name}: ${formatCurrency(row.unlockValueUsd)}`}
                />
                <p className="truncate text-center text-[10px] font-bold text-white">{row.symbol}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl p-4" style={CARD}>
          <div className="mb-4 flex items-center gap-2">
            <Layers3 className="h-4 w-4" style={{ color: "#4d7fff" }} />
            <h2 className="text-sm font-black text-white">Tokenomics Analytics</h2>
          </div>
          <div className="space-y-4">
            {rows.slice(0, 4).map((row) => (
              <div key={`tokenomics-${row.id}`} className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src={row.image} alt="" className="h-7 w-7 rounded-full" />
                    <span className="text-xs font-bold text-white">{row.symbol}</span>
                  </div>
                  <span className="font-mono text-[11px]" style={{ color: "#9aa4b8" }}>
                    {row.vestingProgressPct.toFixed(1)}% vested
                  </span>
                </div>
                <ProgressBar value={row.vestingProgressPct} />
                <p className="mt-2 text-[11px]" style={{ color: "#7d879c" }}>
                  {row.aiSummary}
                </p>
                <div className="mt-3">
                  <AllocationPills row={row} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="rounded-2xl border border-[#2962ff]/20 bg-[#2962ff]/[0.055] p-4 text-xs leading-5" style={{ color: "#94a0b8" }}>
        <p className="font-bold text-white">Provider architecture</p>
        <p>
          Market prices and supply fields refresh every 30 seconds from the existing live market pipeline. The unlock feed is wired to read
          <span className="font-mono text-[#8ab4ff]"> /api/unlocks/upcoming </span>
          when an unlock data provider or internal feed is connected; until then the terminal renders instantly from cached and supply-derived rows so sections never go blank.
        </p>
      </div>
    </div>
  );
}
