import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  useGetTokenScores, getGetTokenScoresQueryKey,
  useGetTokenNews, getGetTokenNewsQueryKey,
} from "@workspace/api-client-react";
import { useAddToWatchlist, useRemoveFromWatchlist, useWatchlist } from "@/hooks/use-watchlist";
import type { CoinLiveData } from "@/hooks/use-coins";
import { analyzeToken } from "@/lib/ai-engine";
import { formatNumber } from "@/lib/format";
import { API_CACHE, cachedJsonFetch } from "@/lib/api-cache";
import { useFearGreedLive } from "@/hooks/use-market-data";
import { isDisplayablePrice } from "@/lib/coin-detail-persist";
import { ActionButton } from "@/components/action-button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Star, Bell, Share2, PieChart, Shield, Activity, TrendingUp,
  Globe, Twitter, Github, MessageCircle, ExternalLink, Copy, Zap,
  BrainCircuit, AlertTriangle, BarChart3,
} from "lucide-react";

const CARD = { background: "rgba(10,14,22,0.92)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16 };

function fmtP(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n === 0) return "—";
  if (n >= 1) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  if (n >= 0.0001) return `$${n.toFixed(6)}`;
  return `$${n.toFixed(8)}`;
}
function fmtB(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n === 0) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}
function fmtPct(n: number | null | undefined, showPlus = true): string {
  if (n == null) return "—";
  const s = n >= 0 && showPlus ? "+" : "";
  return `${s}${n.toFixed(2)}%`;
}

type GlobalCg = { data?: { total_market_cap?: { usd?: number } } };

function SectionTitle({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#8a92a6" }}>{children}</span>
    </div>
  );
}

function Row({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <span className="text-[10px] shrink-0" style={{ color: "#5a6072" }}>{label}</span>
      <div className="text-right min-w-0">
        <div className="text-[11px] font-mono font-bold text-white break-all">{value}</div>
        {hint && <div className="text-[9px] mt-0.5" style={{ color: "#3a4058" }}>{hint}</div>}
      </div>
    </div>
  );
}

function TokenDistributionBar({ circulating, max }: { circulating?: number; max?: number | null }) {
  if (!circulating || !max || max <= 0) {
    return (
      <div className="rounded-xl p-4 text-[10px] leading-relaxed" style={{ background: "rgba(255,255,255,0.03)", color: "#5a6072" }}>
        Circulating vs max supply ratio unavailable — CoinGecko did not publish both values for this asset.
      </div>
    );
  }
  const pct = Math.min(100, Math.max(0, (circulating / max) * 100));
  return (
    <div>
      <div className="flex justify-between text-[10px] mb-1.5" style={{ color: "#5a6072" }}>
        <span>Circulating / max</span>
        <span className="font-mono text-white">{pct.toFixed(1)}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#4d7fff,#26a69a)" }} />
      </div>
    </div>
  );
}

export type TokenIntelligencePanelProps = {
  symbol: string;
  live: CoinLiveData | undefined;
  isFetchingLive: boolean;
  isEnriching: boolean;
  /** Optional: last price from chart series for micro-sync badge */
  chartSynced?: boolean;
};

export function TokenIntelligencePanel({
  symbol,
  live,
  isFetchingLive,
  isEnriching,
  chartSynced,
}: TokenIntelligencePanelProps) {
  const [copied, setCopied] = React.useState(false);
  const { data: watchlist = [] } = useWatchlist();
  const isWatched = watchlist.some(w => w.symbol === symbol || w.coinId === live?.id);
  const watchedItem = watchlist.find(w => w.symbol === symbol || (live?.id && w.coinId === live.id));
  const add = useAddToWatchlist();
  const remove = useRemoveFromWatchlist();

  const { data: globalCg } = useQuery({
    queryKey: ["ca-global-cap"],
    queryFn: () => cachedJsonFetch<GlobalCg>("/api/coins/global", API_CACHE.global),
    staleTime: 60_000,
    placeholderData: (p) => p,
  });

  const { data: fg } = useFearGreedLive();
  const fgEntry = fg?.data?.[0];
  const fgVal = fgEntry ? Number(fgEntry.value) : null;
  const fgLabel = fgEntry?.value_classification ?? null;

  const { data: scores } = useGetTokenScores(symbol, {
    query: {
      queryKey: getGetTokenScoresQueryKey(symbol),
      retry: (failureCount, err) => {
        const status = (err as { status?: number })?.status;
        if (status === 404) return false;
        return failureCount < 2;
      },
    },
  });

  const { data: news } = useGetTokenNews(symbol, {
    query: { queryKey: getGetTokenNewsQueryKey(symbol) },
  });

  const ai = useMemo(
    () =>
      analyzeToken({
        priceChange24h: live?.priceChange24h ?? 0,
        priceChange7d: live?.priceChange7d,
        volume24h: live?.volume24h,
        marketCap: live?.marketCap,
        price: live?.price,
        symbol,
      }),
    [live, symbol],
  );

  const totalMcap = globalCg?.data?.total_market_cap?.usd;
  const dom =
    totalMcap && totalMcap > 0 && live?.marketCap && live.marketCap > 0
      ? (live.marketCap / totalMcap) * 100
      : null;

  const vol = live?.priceChange24h ?? 0;
  const vol7 = live?.priceChange7d ?? 0;
  const volatilityScore = Math.min(100, Math.round(Math.abs(vol) * 1.4 + Math.abs(vol7) * 0.35));

  const vmr =
    live?.marketCap && live.marketCap > 0 && live.volume24h != null
      ? (live.volume24h / live.marketCap) * 100
      : null;

  const trendStrength = Math.min(100, Math.max(0, Math.round(50 + vol * 1.2 + vol7 * 0.25)));

  const impliedLocked =
    live?.totalSupply != null &&
    live.circulatingSupply > 0 &&
    live.totalSupply > live.circulatingSupply
      ? live.totalSupply - live.circulatingSupply
      : null;

  const inflationHint =
    live?.maxSupply == null && live?.totalSupply != null && live.circulatingSupply > 0
      ? "Max supply uncapped or unknown — inflation regime cannot be inferred here."
      : live?.maxSupply != null && live.maxSupply > 0 && live.circulatingSupply > 0
        ? `Issued ${((live.circulatingSupply / live.maxSupply) * 100).toFixed(1)}% of max supply `
        : "—";

  const priceOk = isDisplayablePrice(live?.price);
  const showLiveBadge = priceOk && !isFetchingLive;
  const showSync = priceOk && (isFetchingLive || chartSynced);

  const predictionLine = (label: string, change: number | undefined, tf: string) => {
    if (change == null || !Number.isFinite(change)) {
      return { label, text: "Insufficient historical % change from feed", dir: "neutral" as const };
    }
    const dir = change > 0.5 ? ("bullish" as const) : change < -0.5 ? ("bearish" as const) : ("neutral" as const);
    return {
      label,
      text: `${dir === "bullish" ? "Upside" : dir === "bearish" ? "Downside" : "Sideways"} bias from ${tf} performance (${fmtPct(change)}) — heuristic, not a forecast.`,
      dir,
    };
  };

  const predD = predictionLine("Daily outlook", live?.priceChange24h, "24h");
  const predW = predictionLine("Weekly outlook", live?.priceChange7d, "7d");
  const predM = predictionLine("Monthly outlook", live?.priceChange30d, "30d");
  const predY = predictionLine("Yearly outlook", live?.priceChange1y, "1y");

  const supportZone =
    live?.low24h && live.low24h > 0 ? `${fmtP(live.low24h)} (24h range low)` : "—";
  const resistZone =
    live?.high24h && live.high24h > 0 ? `${fmtP(live.high24h)} (24h range high)` : "—";

  const riskLabel =
    volatilityScore > 70 ? "High" : volatilityScore > 40 ? "Moderate" : "Contained";

  const sentimentBucket =
    ai.sentiment.includes("BULLISH") ? "Bullish" : ai.sentiment.includes("BEARISH") ? "Bearish" : "Neutral";

  const communityScore = (() => {
    let s = 0;
    let n = 0;
    if (live?.community?.twitterFollowers) {
      s += Math.min(100, Math.log10(live.community.twitterFollowers + 1) * 18);
      n++;
    }
    if (live?.community?.redditSubscribers) {
      s += Math.min(100, Math.log10(live.community.redditSubscribers + 1) * 22);
      n++;
    }
    if (live?.community?.telegramUsers) {
      s += Math.min(100, Math.log10(live.community.telegramUsers + 1) * 20);
      n++;
    }
    return n > 0 ? Math.round(s / n) : null;
  })();

  return (
    <div className="rounded-2xl overflow-hidden flex flex-col min-h-0" style={CARD}>
      {/* Header */}
      <div className="p-4 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-start gap-3">
          {live?.image ? (
            <img src={live.image} alt={symbol} className="w-11 h-11 rounded-2xl shrink-0" />
          ) : (
            <Skeleton className="w-11 h-11 rounded-2xl shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[16px] font-black text-white leading-tight truncate">{live?.name ?? symbol}</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0"
                style={{ background: "rgba(255,255,255,0.06)", color: "#8a92a6" }}>{symbol}</span>
              {live?.rank != null && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0"
                  style={{ background: "rgba(247,147,26,0.12)", color: "#f7931a" }}>#{live.rank}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {showSync && (
                <span className="text-[8px] px-1.5 py-0.5 rounded font-semibold"
                  style={{ background: "rgba(41,98,255,0.12)", color: "#4d7fff" }}>Syncing</span>
              )}
              {showLiveBadge && (
                <span className="text-[8px] px-1.5 py-0.5 rounded font-bold"
                  style={{ background: "rgba(38,166,154,0.15)", color: "#26a69a" }}>LIVE</span>
              )}
              {!priceOk && (
                <span className="text-[8px] px-1.5 py-0.5 rounded font-semibold"
                  style={{ background: "rgba(255,255,255,0.06)", color: "#5a6072" }}>Loading</span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-1 justify-end shrink-0">
            {isWatched && watchedItem ? (
              <ActionButton variant="secondary" size="sm" className="!px-2" loading={remove.isPending}
                onClick={() => remove.mutate(watchedItem.id)}
                icon={<Star className="h-3.5 w-3.5" style={{ fill: "#f7931a", color: "#f7931a" }} />}
                title="Watching" />
            ) : (
              <ActionButton variant="ghost" size="sm" className="!px-2" loading={add.isPending}
                onClick={() => add.mutate({ coinId: live?.id ?? symbol, symbol, name: live?.name ?? symbol, image: live?.image })}
                icon={<Star className="h-3.5 w-3.5" />}
                title="Watchlist" />
            )}
            <ActionButton
              variant="ghost"
              size="sm"
              className="!px-2"
              loading={add.isPending}
              onClick={() => {
                if (!isWatched)
                  add.mutate({ coinId: live?.id ?? symbol, symbol, name: live?.name ?? symbol, image: live?.image });
              }}
              icon={<BarChart3 className="h-3.5 w-3.5" />}
              title="Add to portfolio (watchlist)"
            />
            <ActionButton variant="ghost" size="sm" className="!px-2"
              onClick={() => window.alert("Price alerts are not enabled in this build. Use Watchlist + live prices for now.")}
              icon={<Bell className="h-3.5 w-3.5" />}
              title="Alerts" />
            <ActionButton variant="ghost" size="sm" className="!px-2"
              onClick={() => { void navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
              icon={copied ? <Copy className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
              title="Share" />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="text-[9px] uppercase font-semibold mb-0.5" style={{ color: "#4a5068" }}>Price</div>
            {priceOk ? (
              <div className="text-[20px] font-mono font-black text-white">{fmtP(live?.price)}</div>
            ) : (
              <Skeleton className="h-7 w-28 rounded-lg mt-1" />
            )}
          </div>
          <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="text-[9px] uppercase font-semibold mb-0.5" style={{ color: "#4a5068" }}>24h / 7d</div>
            <div className="text-[13px] font-mono font-bold">
              <span style={{ color: (live?.priceChange24h ?? 0) >= 0 ? "#26a69a" : "#ef5350" }}>{fmtPct(live?.priceChange24h)}</span>
              <span style={{ color: "#3a4058" }}> · </span>
              <span style={{ color: (live?.priceChange7d ?? 0) >= 0 ? "#26a69a" : "#ef5350" }}>{fmtPct(live?.priceChange7d)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-5 overflow-y-auto max-h-[calc(100vh-8rem)] xl:max-h-[calc(100vh-5rem)] min-h-0">
        <section>
          <SectionTitle
            icon={<Activity className="h-3.5 w-3.5" style={{ color: "#4d7fff" }} />}
          >Core market data</SectionTitle>
          <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.02)" }}>
            <Row label="Market cap" value={fmtB(live?.marketCap)} />
            <Row label="FDV" value={fmtB(live?.fdv)} />
            <Row label="Volume (24h)" value={fmtB(live?.volume24h)} hint="24h quote volume from CoinGecko" />
            <Row label="Liquidity proxy" value={vmr != null ? `${vmr.toFixed(2)}% turnover` : "—"} hint="Volume ÷ market cap — not order-book depth" />
            <Row label="ATH" value={fmtP(live?.ath)} hint={live?.athDate ? new Date(live.athDate).toLocaleDateString() : undefined} />
            <Row label="ATL" value={fmtP(live?.atl)} hint={live?.atlDate ? new Date(live.atlDate).toLocaleDateString() : undefined} />
            <Row label="Volatility score" value={`${volatilityScore}/100`} hint="From live |24h| & |7d| moves" />
            <Row label="Dominance (est.)" value={dom != null ? `${dom.toFixed(3)}%` : "—"} hint="Coin mcap ÷ total crypto mcap" />
            <Row label="Holders" value="—" hint="Not available from CoinGecko REST" />
          </div>
        </section>

        <section>
          <SectionTitle icon={<PieChart className="h-3.5 w-3.5" style={{ color: "#4d7fff" }} />}>Supply & tokenomics</SectionTitle>
          <div className="rounded-xl p-3 space-y-3" style={{ background: "rgba(255,255,255,0.02)" }}>
            <Row label="Circulating" value={live?.circulatingSupply ? formatNumber(live.circulatingSupply) : "—"} />
            <Row label="Total supply" value={live?.totalSupply != null ? formatNumber(live.totalSupply) : "—"} />
            <Row label="Max supply" value={live?.maxSupply != null ? formatNumber(live.maxSupply) : "Uncapped / unknown"} />
            <Row
              label="Burned / locked (proxy)"
              value={impliedLocked != null ? formatNumber(impliedLocked) : "—"}
              hint={
                impliedLocked != null
                  ? "Total − circulating (not verified on-chain)"
                  : "Burned supply not reported; implied lock only when total > circulating"
              }
            />
            <Row label="Inflation / issuance" value={inflationHint.length > 60 ? "See circulating vs max" : inflationHint} />
            <Row label="Vesting / unlocks" value="—" hint="Not in CoinGecko coin payload for this screen" />
            <TokenDistributionBar circulating={live?.circulatingSupply} max={live?.maxSupply} />
          </div>
        </section>

        <section>
          <SectionTitle icon={<Shield className="h-3.5 w-3.5" style={{ color: "#4d7fff" }} />}>Contract & networks</SectionTitle>
          <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.02)" }}>
            <Row label="Native / primary" value={live?.contractAddress || "—"} />
            {live?.platforms && Object.entries(live.platforms).filter(([, v]) => v).length > 0 ? (
              Object.entries(live.platforms)
                .filter(([, v]) => v)
                .slice(0, 4)
                .map(([chain, addr]) => (
                  <Row key={chain} label={chain} value={<code className="text-[10px] break-all">{addr}</code>} />
                ))
            ) : (
              <Row label="Platforms" value={isEnriching ? "Loading…" : "—"} />
            )}
            <Row label="Explorers" value={live?.links?.explorers?.length ? `${live.links.explorers.length} links` : "—"} />
            <Row label="CEX listings (sample)" value={live?.exchanges?.length ? `${live.exchanges.length} pairs` : isEnriching ? "Loading…" : "—"} />
            <Row label="Audit status" value="—" hint="Use explorer + issuer disclosures" />
            <Row label="Security / risk score" value={scores?.riskScore != null ? `${scores.riskScore}/100` : "—"} hint="From CoinAstra scores API when present" />
            <Row label="Whale feed" value="—" hint="Requires dedicated on-chain indexer" />
          </div>
        </section>

        <section>
          <SectionTitle icon={<Globe className="h-3.5 w-3.5" style={{ color: "#4d7fff" }} />}>Social & community</SectionTitle>
          <div className="rounded-xl p-3 space-y-2" style={{ background: "rgba(255,255,255,0.02)" }}>
            {live?.links?.homepage && (
              <a href={live.links.homepage} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[11px] text-white hover:underline">
                <Globe className="h-3.5 w-3.5 shrink-0" style={{ color: "#4d7fff" }} /> Website <ExternalLink className="h-3 w-3 ml-auto" style={{ color: "#5a6072" }} />
              </a>
            )}
            {live?.links?.twitter && (
              <a
                href={live.links.twitter.startsWith("http") ? live.links.twitter : `https://twitter.com/${live.links.twitter}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-[11px] text-white hover:underline"
              >
                <Twitter className="h-3.5 w-3.5 shrink-0" style={{ color: "#1da1f2" }} /> X / Twitter <ExternalLink className="h-3 w-3 ml-auto" style={{ color: "#5a6072" }} />
              </a>
            )}
            {live?.links?.reddit && (
              <a href={live.links.reddit} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[11px] text-white hover:underline">
                <MessageCircle className="h-3.5 w-3.5 shrink-0" style={{ color: "#ff4500" }} /> Reddit <ExternalLink className="h-3 w-3 ml-auto" style={{ color: "#5a6072" }} />
              </a>
            )}
            {(live?.links?.github?.length ?? 0) > 0 &&
              live!.links!.github!.map(url => (
                <a key={url} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[11px] text-white hover:underline">
                  <Github className="h-3.5 w-3.5 shrink-0" style={{ color: "#8a92a6" }} /> GitHub <ExternalLink className="h-3 w-3 ml-auto" style={{ color: "#5a6072" }} />
                </a>
              ))}
            <div className="pt-2 mt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <Row label="Twitter followers" value={live?.community?.twitterFollowers?.toLocaleString() ?? "—"} />
              <Row label="Reddit subscribers" value={live?.community?.redditSubscribers?.toLocaleString() ?? "—"} />
              <Row label="Telegram users" value={live?.community?.telegramUsers?.toLocaleString() ?? "—"} />
              <Row label="Discord" value="—" hint="Not exposed in this CoinGecko field set" />
              <Row label="Community score (est.)" value={communityScore != null ? `${communityScore}/100` : "—"} hint="Log-scaled from public follower counts" />
              <Row label="Social trend" value={fmtPct(live?.priceChange24h)} hint="Price momentum as crude engagement proxy" />
            </div>
          </div>
        </section>

        <section>
          <SectionTitle icon={<BrainCircuit className="h-3.5 w-3.5" style={{ color: "#4d7fff" }} />}>AI intelligence (heuristic)</SectionTitle>
          <div className="rounded-xl p-3 space-y-2 text-[10px]" style={{ background: "rgba(41,98,255,0.06)", border: "1px solid rgba(41,98,255,0.12)" }}>
            <p style={{ color: "#8892a4" }}>Signals are computed locally from live CoinGecko deltas — not a trading model.</p>
            <Row label="Confidence" value={`${ai.confidence}%`} />
            <Row label={predD.label} value={predD.text} />
            <Row label={predW.label} value={predW.text} />
            <Row label={predM.label} value={predM.text} />
            <Row label={predY.label} value={predY.text} />
            <Row label="Support zone" value={supportZone} />
            <Row label="Resistance zone" value={resistZone} />
            <Row label="Sentiment" value={`${sentimentBucket} · ${ai.sentiment.replace(/_/g, " ")}`} />
            <Row label="Risk" value={riskLabel} />
            <Row label="Volatility outlook" value={`${volatilityScore}/100 short-term activity`} />
            <Row label="Momentum" value={`${ai.momentumScore > 0 ? "+" : ""}${ai.momentumScore}`} />
            <Row label="Smart money (proxy)" value={ai.smartMoney} hint="Volume vs mcap heuristic" />
          </div>
        </section>

        <section>
          <SectionTitle icon={<Zap className="h-3.5 w-3.5" style={{ color: "#4d7fff" }} />}>Utility & ecosystem</SectionTitle>
          <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.02)" }}>
            <p className="text-[10px] leading-relaxed mb-2" style={{ color: "#7d8496" }}>
              {live?.description
                ? live.description.replace(/<[^>]+>/g, "").slice(0, 280) + (live.description.length > 280 ? "…" : "")
                : isEnriching
                  ? "Loading description…"
                  : "No description from API."}
            </p>
            <Row label="Sectors" value={live?.categories?.length ? live.categories.join(", ") : "—"} />
            <Row label="Similar / competitors" value="See Similar Coins below" hint="Correlation ranks under Explore" />
            <Row label="Institutional" value="—" hint="Not tagged in this dataset" />
          </div>
        </section>

        <section>
          <SectionTitle icon={<TrendingUp className="h-3.5 w-3.5" style={{ color: "#4d7fff" }} />}>Macro & tape</SectionTitle>
          <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.02)" }}>
            <Row label="Fear & Greed" value={fgVal != null && Number.isFinite(fgVal) ? `${fgVal} (${fgLabel ?? "n/a"})` : "—"} hint="Alternative.me index, crypto-wide" />
            <Row label="Smart money flow (proxy)" value={ai.smartMoney} />
            <Row label="Trend strength" value={`${trendStrength}/100`} />
            <Row label="Sector rank" value="—" hint="Open Heatmap for category performance" />
            <Row label="Correlation" value="—" hint="Compare tool coming soon" />
          </div>
        </section>

        {scores && (
          <section>
            <SectionTitle icon={<Activity className="h-3.5 w-3.5" style={{ color: "#4d7fff" }} />}>API scores</SectionTitle>
            <div className="rounded-xl p-3 text-[10px]" style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="flex justify-between mb-2">
                <span style={{ color: "#5a6072" }}>Final grade</span>
                <span className="font-black text-white">{scores.finalGrade ?? "—"}</span>
              </div>
              <Row label="Overall" value={`${scores.overallScore}/100`} />
              <Row label="Fundamental" value={`${scores.fundamentalScore}/100`} />
              <Row label="Technical" value={`${scores.technicalScore}/100`} />
            </div>
          </section>
        )}

        <section>
          <SectionTitle icon={<MessageCircle className="h-3.5 w-3.5" style={{ color: "#4d7fff" }} />}>News & mentions</SectionTitle>
          <div className="rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.02)" }}>
            {!news?.length ? (
              <div className="p-4 text-[10px] flex gap-2" style={{ color: "#5a6072" }}>
                <AlertTriangle className="h-4 w-4 shrink-0" /> No headlines from the news feed for {symbol}. Social streams require additional connectors.
              </div>
            ) : (
              news.slice(0, 5).map(item => (
                <a key={item.id} href={item.url} target="_blank" rel="noreferrer"
                  className="block p-3 transition-colors hover:bg-white/[0.04]" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div className="text-[10px] font-semibold text-white line-clamp-2">{item.title}</div>
                  <div className="text-[9px] mt-1" style={{ color: "#4a5068" }}>{item.source} · {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : ""}</div>
                </a>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
