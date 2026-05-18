import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Activity,
  BarChart2,
  Layers3,
  LineChart,
  Maximize2,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Zap,
} from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { ChartTimeframeBar } from "@/components/chart-timeframe-bar";
import { Skeleton } from "@/components/ui/skeleton";
import type { CoinLiveData } from "@/hooks/use-coins";
import {
  resolveTradingViewSymbol,
  writeTvSymbolCache,
} from "@/lib/tradingview-symbol";

const CARD = {
  background:
    "linear-gradient(150deg, rgba(8,12,22,0.98) 0%, rgba(10,14,24,0.96) 48%, rgba(5,8,15,0.98) 100%)",
  border: "1px solid rgba(99,134,255,0.18)",
  borderRadius: 28,
  boxShadow:
    "0 28px 90px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)",
};

/** TradingView chart.style: 1 candles, 2 line */
type TvStyleMode = "candles" | "line";

const TV_TIMEFRAMES: { label: string; value: string }[] = [
  { label: "1H", value: "60" },
  { label: "4H", value: "240" },
  /** Intraday view for ~last session; distinct from 1H candle size */
  { label: "24H", value: "15" },
  { label: "7D", value: "D" },
  { label: "1M", value: "D" },
  { label: "3M", value: "D" },
  { label: "1Y", value: "W" },
  { label: "ALL", value: "M" },
];

const TV_EMBED =
  "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";

function fmtPct(n: number | null | undefined, showPlus = true): string {
  if (n == null) return "—";
  const s = n >= 0 && showPlus ? "+" : "";
  return `${s}${n.toFixed(2)}%`;
}

function fmtPrice(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n <= 0) return "—";
  if (n >= 1) return `$${n.toLocaleString("en", { maximumFractionDigits: 2 })}`;
  if (n >= 0.01)
    return `$${n.toLocaleString("en", { maximumFractionDigits: 4 })}`;
  return `$${n.toPrecision(4)}`;
}

function fmtUsdCompact(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n <= 0) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(n >= 10e9 ? 1 : 2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(n >= 10e6 ? 1 : 2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return fmtPrice(n);
}

function fmtRange(
  low: number | null | undefined,
  high: number | null | undefined,
): string {
  if (!low || !high || !Number.isFinite(low) || !Number.isFinite(high))
    return "—";
  return `${fmtPrice(low)} - ${fmtPrice(high)}`;
}

function MetricTile({
  label,
  value,
  accent,
  sub,
}: {
  label: string;
  value: string;
  accent?: string;
  sub?: string;
}) {
  return (
    <div
      className="min-w-0 rounded-2xl px-3 py-3"
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.018))",
        border: "1px solid rgba(255,255,255,0.075)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      <div
        className="text-[9px] font-black uppercase tracking-[0.18em]"
        style={{ color: "#616b85" }}
      >
        {label}
      </div>
      <div
        className="mt-1 truncate font-mono text-[13px] font-black text-white"
        style={{ color: accent ?? "#fff" }}
      >
        {value}
      </div>
      {sub && (
        <div
          className="mt-0.5 truncate text-[10px] font-medium"
          style={{ color: "#6f7891" }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function TradingViewMount({
  tvSymbol,
  interval,
  chartStyle,
  height,
  onPainted,
}: {
  tvSymbol: string;
  interval: string;
  chartStyle: TvStyleMode;
  height: number;
  onPainted?: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || !tvSymbol) return;

    el.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "tradingview-widget-container__widget w-full";
    wrap.style.minHeight = `${height}px`;
    el.appendChild(wrap);

    const script = document.createElement("script");
    script.src = TV_EMBED;
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval,
      timezone: "Etc/UTC",
      theme: "dark",
      style: chartStyle === "line" ? "2" : "1",
      locale: "en",
      backgroundColor: "#060a12",
      gridColor: "rgba(113,129,170,0.12)",
      watchlist: [],
      details: true,
      calendar: false,
      hide_side_toolbar: false,
      hide_top_toolbar: false,
      hide_legend: false,
      allow_symbol_change: true,
      save_image: false,
      withdateranges: true,
      hotlist: false,
      studies: ["STD;EMA", "STD;MACD", "STD;RSI"],
      overrides: {
        "paneProperties.background": "#060a12",
        "paneProperties.backgroundType": "solid",
        "paneProperties.vertGridProperties.color": "rgba(113,129,170,0.10)",
        "paneProperties.horzGridProperties.color": "rgba(113,129,170,0.10)",
        "scalesProperties.textColor": "#8d96ad",
      },
      support_host: "https://www.tradingview.com",
    });

    const done = () => onPainted?.();
    script.addEventListener("load", done);
    const fallback = window.setTimeout(done, 2_000);

    el.appendChild(script);

    return () => {
      window.clearTimeout(fallback);
      script.removeEventListener("load", done);
      el.innerHTML = "";
    };
  }, [tvSymbol, interval, chartStyle, height, onPainted]);

  return (
    <div
      ref={rootRef}
      className="w-full tradingview-widget-container"
      style={{ minHeight: height }}
    />
  );
}

export type TradingViewCoinChartProps = {
  coinId?: string;
  symbol: string;
  live?: CoinLiveData;
  onChartRevalidate?: (syncing: boolean) => void;
};

export function TradingViewCoinChart({
  coinId,
  symbol,
  live,
  onChartRevalidate,
}: TradingViewCoinChartProps) {
  const [interval, setInterval] = useState("D");
  const [styleMode, setStyleMode] = useState<TvStyleMode>("candles");
  const [showSkeleton, setShowSkeleton] = useState(true);
  const wrapRef = useRef<HTMLDivElement>(null);

  const tvSymbol = useMemo(
    () => resolveTradingViewSymbol(coinId, symbol),
    [coinId, symbol],
  );

  useEffect(() => {
    if (coinId && tvSymbol) writeTvSymbolCache(coinId, tvSymbol);
  }, [coinId, tvSymbol]);

  useEffect(() => {
    setShowSkeleton(true);
    onChartRevalidate?.(true);
  }, [tvSymbol, interval, styleMode, onChartRevalidate]);

  const onPainted = useCallback(() => {
    setShowSkeleton(false);
    onChartRevalidate?.(false);
  }, [onChartRevalidate]);

  const pct24 = live?.priceChange24h;
  const isUp = (pct24 ?? 0) >= 0;
  const signalColor = isUp ? "#26a69a" : "#ef5350";

  const enterFs = () => {
    const n = wrapRef.current;
    if (!n?.requestFullscreen) return;
    void n.requestFullscreen();
  };

  const chartHeight =
    typeof window !== "undefined" &&
    window.matchMedia?.("(min-width: 1024px)").matches
      ? 620
      : 500;

  const waitingId = !coinId?.trim();
  const metricTiles = useMemo(
    () => [
      {
        label: "Last price",
        value: fmtPrice(live?.price),
        accent: "#ffffff",
        sub: waitingId ? "Resolving market" : "CoinGecko live",
      },
      {
        label: "24h change",
        value: fmtPct(live?.priceChange24h),
        accent: (live?.priceChange24h ?? 0) >= 0 ? "#26a69a" : "#ef5350",
        sub: "Momentum",
      },
      {
        label: "24h range",
        value: fmtRange(live?.low24h, live?.high24h),
        accent: "#9bb4ff",
        sub: "Low - high",
      },
      {
        label: "Volume",
        value: fmtUsdCompact(live?.volume24h),
        accent: "#d8def5",
        sub: "24h turnover",
      },
      {
        label: "Market cap",
        value: fmtUsdCompact(live?.marketCap),
        accent: "#d8def5",
        sub: live?.rank ? `Rank #${live.rank}` : "Market value",
      },
    ],
    [live, waitingId],
  );

  return (
    <div className="relative overflow-hidden" style={CARD}>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 18% 0%, rgba(41,98,255,0.24), transparent 33%), radial-gradient(circle at 82% 10%, rgba(38,166,154,0.14), transparent 30%)",
        }}
      />
      <div
        className="relative flex flex-col gap-4 px-4 pt-4 pb-3 sm:px-5 sm:pt-5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.2em]"
                style={{
                  background: "rgba(77,127,255,0.13)",
                  border: "1px solid rgba(77,127,255,0.28)",
                  color: "#9bb4ff",
                }}
              >
                <Zap className="h-3 w-3" aria-hidden />
                Pro terminal
              </span>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em]"
                style={{
                  background: "rgba(38,166,154,0.09)",
                  border: "1px solid rgba(38,166,154,0.18)",
                  color: "#8bd6cf",
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    background: "#26a69a",
                    boxShadow: "0 0 10px rgba(38,166,154,0.9)",
                  }}
                />
                Live market
              </span>
            </div>
            <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <BarChart2
                    className="h-5 w-5 shrink-0"
                    style={{ color: "#6f8fff" }}
                  />
                  <h2 className="truncate text-[20px] font-black tracking-[-0.02em] text-white sm:text-[24px]">
                    {symbol.toUpperCase()} Advanced Chart
                  </h2>
                </div>
                <p
                  className="mt-1 max-w-2xl text-[11px] leading-relaxed"
                  style={{ color: "#838da7" }}
                >
                  Institutional charting with TradingView indicators, drawing
                  tools, timeframe ranges, and live CoinGecko context.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="max-w-[220px] truncate rounded-xl px-2.5 py-1.5 font-mono text-[11px] font-black"
                  style={{
                    background: "rgba(255,255,255,0.055)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#b9c6ff",
                  }}
                  title={tvSymbol}
                >
                  {waitingId ? "…" : tvSymbol}
                </span>
                {pct24 != null && Number.isFinite(pct24) ? (
                  <span
                    className="rounded-xl px-2.5 py-1.5 font-mono text-[11px] font-black"
                    style={{
                      background: isUp
                        ? "rgba(38,166,154,0.11)"
                        : "rgba(239,83,80,0.11)",
                      border: `1px solid ${isUp ? "rgba(38,166,154,0.25)" : "rgba(239,83,80,0.25)"}`,
                      color: signalColor,
                    }}
                  >
                    24h {fmtPct(pct24)}
                  </span>
                ) : (
                  <Skeleton className="h-7 w-20 rounded-xl" />
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ActionButton
              variant="ghost"
              size="sm"
              onClick={enterFs}
              title="Fullscreen chart"
              aria-label="Fullscreen chart"
            >
              <Maximize2 className="h-3.5 w-3.5" aria-hidden />
            </ActionButton>
            <ActionButton
              variant="ghost"
              size="sm"
              onClick={() =>
                window.open(
                  `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol)}`,
                  "_blank",
                  "noopener,noreferrer",
                )
              }
            >
              Open in TV
            </ActionButton>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {metricTiles.map((m) => (
            <MetricTile key={m.label} {...m} />
          ))}
        </div>

        <div
          className="flex flex-col gap-3 rounded-2xl p-3 lg:flex-row lg:items-center lg:justify-between"
          style={{
            background: "rgba(3,6,12,0.35)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div
            className="flex flex-wrap items-center gap-2 text-[10px] font-bold"
            style={{ color: "#7f8aa3" }}
          >
            <span
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              <Layers3
                className="h-3.5 w-3.5"
                style={{ color: "#9bb4ff" }}
                aria-hidden
              />
              EMA + MACD + RSI
            </span>
            <span
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              <ShieldCheck
                className="h-3.5 w-3.5"
                style={{ color: "#26a69a" }}
                aria-hidden
              />
              Live TradingView tools
            </span>
          </div>
          <ChartTimeframeBar<TvStyleMode, string>
            modes={[
              { id: "candles", label: "Candles" },
              { id: "line", label: "Line" },
            ]}
            activeMode={styleMode}
            onModeChange={setStyleMode}
            timeframes={TV_TIMEFRAMES}
            activeTf={interval}
            onTfChange={setInterval}
          />
        </div>
      </div>

      <div className="relative px-3 pb-3 pt-3 sm:px-5 sm:pb-5">
        <div
          className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl px-3 py-2"
          style={{
            background:
              "linear-gradient(90deg, rgba(77,127,255,0.10), rgba(38,166,154,0.06), rgba(255,255,255,0.03))",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em]"
            style={{ color: "#8d98b3" }}
          >
            <Activity
              className="h-3.5 w-3.5"
              style={{ color: signalColor }}
              aria-hidden
            />
            Advanced market workspace
          </div>
          <div
            className="flex items-center gap-2 text-[10px] font-bold"
            style={{ color: "#66728d" }}
          >
            <LineChart className="h-3.5 w-3.5" aria-hidden />
            Candles, trendlines, studies, compare
          </div>
        </div>
        <div
          ref={wrapRef}
          className="relative w-full min-w-0 overflow-hidden rounded-[22px]"
          style={{
            minHeight: chartHeight,
            background: "#060a12",
            border: "1px solid rgba(120,143,205,0.18)",
            boxShadow:
              "0 18px 50px rgba(0,0,0,0.36), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >
          {(showSkeleton || waitingId) && (
            <div
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-6"
              style={{
                background:
                  "radial-gradient(circle at 50% 22%, rgba(77,127,255,0.20), transparent 34%), linear-gradient(180deg, rgba(6,10,18,0.98) 0%, rgba(6,10,18,0.94) 100%)",
                pointerEvents: waitingId ? "auto" : "none",
              }}
            >
              <div
                className="rounded-2xl p-4"
                style={{
                  background: "rgba(77,127,255,0.09)",
                  border: "1px solid rgba(77,127,255,0.22)",
                }}
              >
                <RefreshCw
                  className={`h-6 w-6 ${waitingId ? "" : "animate-spin"}`}
                  style={{ color: "#8fa8ff" }}
                />
              </div>
              <p
                className="max-w-md text-center text-[13px] font-bold leading-snug"
                style={{ color: "#d8def5" }}
              >
                {waitingId ? "Resolving coin…" : "Loading TradingView chart…"}
              </p>
              <Skeleton className="h-48 w-full max-w-3xl rounded-2xl opacity-80" />
            </div>
          )}

          {!waitingId && (
            <div className="w-full opacity-100">
              <TradingViewMount
                key={`${tvSymbol}|${interval}|${styleMode}`}
                tvSymbol={tvSymbol}
                interval={interval}
                chartStyle={styleMode}
                height={chartHeight}
                onPainted={onPainted}
              />
            </div>
          )}
        </div>
        <div
          className="mt-3 flex flex-wrap items-center gap-2 text-[10px]"
          style={{ color: "#6f7891" }}
        >
          <TrendingUp
            className="h-3.5 w-3.5 shrink-0"
            style={{ color: "#6f8fff" }}
          />
          <span>
            Default studies load with EMA, MACD, and RSI. Use the TradingView
            toolbar for drawings, compare, and layouts.
          </span>
        </div>
      </div>
    </div>
  );
}
