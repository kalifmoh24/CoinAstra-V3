import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BarChart2, Maximize2, RefreshCw, TrendingUp } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { ChartTimeframeBar } from "@/components/chart-timeframe-bar";
import { Skeleton } from "@/components/ui/skeleton";
import type { CoinLiveData } from "@/hooks/use-coins";
import { resolveTradingViewSymbol, writeTvSymbolCache } from "@/lib/tradingview-symbol";

const CARD = { background: "rgba(10,14,22,0.92)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16 };

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

const TV_EMBED = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";

/** Reserved strip under the iframe for TradingView branding (autosize layout). */
const TV_WIDGET_CHROME_PX = 32;

function fmtPct(n: number | null | undefined, showPlus = true): string {
  if (n == null) return "—";
  const s = n >= 0 && showPlus ? "+" : "";
  return `${s}${n.toFixed(2)}%`;
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
    const innerH = Math.max(280, height - TV_WIDGET_CHROME_PX);
    const wrap = document.createElement("div");
    wrap.className = "tradingview-widget-container__widget w-full";
    wrap.style.width = "100%";
    wrap.style.height = `${innerH}px`;
    el.appendChild(wrap);

    const script = document.createElement("script");
    script.src = TV_EMBED;
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: false,
      height: innerH,
      symbol: tvSymbol,
      interval,
      timezone: "Etc/UTC",
      theme: "dark",
      style: chartStyle === "line" ? "2" : "1",
      locale: "en",
      backgroundColor: "#0d1119",
      gridColor: "rgba(255,255,255,0.07)",
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
      style={{ height, width: "100%", minHeight: height }}
    />
  );
}

export type TradingViewCoinChartProps = {
  coinId?: string;
  symbol: string;
  live?: CoinLiveData;
  onChartRevalidate?: (syncing: boolean) => void;
};

export function TradingViewCoinChart({ coinId, symbol, live, onChartRevalidate }: TradingViewCoinChartProps) {
  const [interval, setInterval] = useState("D");
  const [styleMode, setStyleMode] = useState<TvStyleMode>("candles");
  const [showSkeleton, setShowSkeleton] = useState(true);
  const wrapRef = useRef<HTMLDivElement>(null);

  const tvSymbol = useMemo(() => resolveTradingViewSymbol(coinId, symbol), [coinId, symbol]);

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

  const enterFs = () => {
    const n = wrapRef.current;
    if (!n?.requestFullscreen) return;
    void n.requestFullscreen();
  };

  const chartHeight =
    typeof window !== "undefined" && window.matchMedia?.("(min-width: 1024px)").matches ? 600 : 480;

  const waitingId = !coinId?.trim();

  return (
    <div className="rounded-2xl overflow-hidden" style={CARD}>
      <div
        className="flex flex-col gap-3 px-4 pt-4 pb-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
          <div className="flex items-center gap-3 flex-wrap min-w-0">
            <BarChart2 className="h-4 w-4 shrink-0" style={{ color: "#4d7fff" }} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[13px] font-bold text-white">TradingView chart</span>
                <span
                  className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-lg truncate max-w-[220px]"
                  style={{ background: "rgba(41,98,255,0.12)", color: "#8ab4ff" }}
                  title={tvSymbol}
                >
                  {waitingId ? "…" : tvSymbol}
                </span>
              </div>
              <p className="text-[10px] mt-0.5 leading-snug" style={{ color: "#6b7389" }}>
                Historical candles and indicators by TradingView. Market stats stay on CoinGecko.
              </p>
            </div>
            {pct24 != null && Number.isFinite(pct24) ? (
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-lg shrink-0 ${isUp ? "text-[#26a69a]" : "text-[#ef5350]"}`}
                style={{ background: isUp ? "rgba(38,166,154,0.1)" : "rgba(239,83,80,0.1)" }}
              >
                24h {fmtPct(pct24)}
              </span>
            ) : (
              <Skeleton className="h-6 w-16 rounded-lg shrink-0" />
            )}
          </div>
          <div className="flex flex-wrap gap-1 items-center">
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

        <div className="flex flex-wrap items-center gap-2 text-[10px]" style={{ color: "#6b7389" }}>
          <TrendingUp className="h-3.5 w-3.5 shrink-0" style={{ color: "#4d7fff" }} />
          <span>
            Toolbar: indicators (RSI, MACD, MAs), drawings, compare, layouts — same as TradingView web.
          </span>
        </div>
      </div>

      <div
        ref={wrapRef}
        className="relative w-full min-w-0 min-h-0"
        style={{ height: chartHeight, minHeight: chartHeight }}
      >
        {(showSkeleton || waitingId) && (
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-6"
            style={{
              background: "linear-gradient(180deg, rgba(13,17,25,0.97) 0%, rgba(13,17,25,0.92) 100%)",
              pointerEvents: waitingId ? "auto" : "none",
            }}
          >
            <RefreshCw className={`h-6 w-6 ${waitingId ? "" : "animate-spin"}`} style={{ color: "#4d7fff" }} />
            <p className="text-[13px] font-medium text-center max-w-md leading-snug" style={{ color: "#b4bcc8" }}>
              {waitingId ? "Resolving coin…" : "Loading TradingView chart…"}
            </p>
            <Skeleton className="h-40 w-full max-w-2xl rounded-xl opacity-80" />
          </div>
        )}

        {!waitingId && (
          <div className="w-full h-full opacity-100" style={{ height: "100%" }}>
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
    </div>
  );
}
