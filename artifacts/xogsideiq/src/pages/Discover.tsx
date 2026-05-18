import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  Search, Plus, Check, ChevronLeft, ChevronRight, Globe, Layers,
  TrendingUp, TrendingDown, RefreshCw, Star, Loader2, X, Filter,
  BarChart2, Zap, ExternalLink,
} from "lucide-react";
import {
  useCoinCategories,
  useCategoryCoins,
  useAllCoins,
  usePlatformTokenSymbols,
  useImportCoin,
  useCoinSearch,
  type CoinCategory,
  type CoinMarketItem,
} from "@/hooks/use-coins";

/* ── Palette ─────────────────────────────────────────────────────────────── */
const BG   = { background: "rgba(13,17,26,0.95)" };
const CARD = { background: "rgba(10,14,22,0.90)", border: "1px solid rgba(255,255,255,0.06)" };
const BLUE = "#2962ff";
const BULL = "#26a69a";
const BEAR = "#ef5350";

/* ── Formatters ─────────────────────────────────────────────────────────── */
function fmtP(n: number | undefined | null): string {
  if (n == null) return "—";
  if (n >= 1e12) return "$" + (n / 1e12).toFixed(2) + "T";
  if (n >= 1e9)  return "$" + (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6)  return "$" + (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3)  return "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return "$" + n.toPrecision(4);
}
function fmtPrice(n: number | undefined | null): string {
  if (n == null || n === 0) return "—";
  if (n >= 1000) return "$" + n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (n >= 1)    return "$" + n.toFixed(4);
  if (n >= 0.01) return "$" + n.toFixed(5);
  return "$" + n.toExponential(3);
}
function fmtPct(n: number | undefined | null): string {
  if (n == null) return "—";
  return (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
}

/* ── Category Sidebar Item ───────────────────────────────────────────────── */
function CategoryItem({
  cat,
  selected,
  onClick,
}: {
  cat: CoinCategory | null;
  selected: boolean;
  onClick: () => void;
}) {
  const isAll = cat === null;
  const ch    = cat?.market_cap_change_24h ?? 0;
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2.5 rounded-xl transition-all"
      style={{
        background: selected ? "rgba(41,98,255,0.15)" : "transparent",
        border: selected ? "1px solid rgba(41,98,255,0.35)" : "1px solid transparent",
      }}
    >
      <div className="flex items-center gap-2">
        {isAll ? (
          <Globe className="h-4 w-4 flex-shrink-0" style={{ color: BLUE }} />
        ) : (
          <div className="flex -space-x-1 flex-shrink-0">
            {(cat!.top_3_coins ?? []).slice(0, 3).map((url, i) => (
              <img
                key={i}
                src={url}
                alt=""
                className="w-4 h-4 rounded-full"
                style={{ border: "1px solid rgba(0,0,0,0.4)", zIndex: 3 - i }}
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            ))}
          </div>
        )}
        <span className="text-[12px] font-semibold flex-1 truncate" style={{ color: selected ? "#fff" : "#8892a4" }}>
          {isAll ? "All Coins" : cat!.name}
        </span>
        {!isAll && ch !== 0 && (
          <span className="text-[9px] font-bold flex-shrink-0" style={{ color: ch >= 0 ? BULL : BEAR }}>
            {ch >= 0 ? "+" : ""}{ch.toFixed(1)}%
          </span>
        )}
      </div>
    </button>
  );
}

/* ── Coin Table Row ──────────────────────────────────────────────────────── */
function CoinRow({
  coin,
  rank,
  isAdded,
  onAdd,
  onView,
  addingId,
}: {
  coin: CoinMarketItem;
  rank: number;
  isAdded: boolean;
  onAdd: (coin: CoinMarketItem) => void;
  onView: (symbol: string) => void;
  addingId: string | null;
}) {
  const ch24 = coin.price_change_percentage_24h;
  const ch7d  = coin.price_change_percentage_7d_in_currency;
  const isAdding = addingId === coin.id;
  const noMktData = coin.market_cap === 0 && coin.total_volume === 0;

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={() => onView(coin.symbol.toUpperCase())}
      className="group border-b cursor-pointer hover:bg-white/[0.03]"
      style={{ borderColor: "rgba(255,255,255,0.04)" }}
    >
      {/* Rank */}
      <td className="py-3 px-3 text-center">
        <span className="text-[11px] font-mono" style={{ color: "#4a5068" }}>
          {rank}
        </span>
      </td>

      {/* Coin name/logo */}
      <td className="py-3 px-3">
        <div className="flex items-center gap-2.5">
          <img
            src={coin.image}
            alt={coin.name}
            className="w-7 h-7 rounded-full flex-shrink-0"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
          <div className="min-w-0">
            <div className="text-[13px] font-bold text-white truncate max-w-[140px]">{coin.name}</div>
            <div className="text-[10px] font-mono" style={{ color: "#4a5068" }}>{coin.symbol.toUpperCase()}</div>
          </div>
        </div>
      </td>

      {/* Price */}
      <td className="py-3 px-3 text-right">
        <span className="text-[12px] font-mono font-semibold text-white">{noMktData ? "—" : fmtPrice(coin.current_price)}</span>
      </td>

      {/* 24h % */}
      <td className="py-3 px-3 text-right">
        <span className="text-[11px] font-bold font-mono" style={{ color: noMktData ? "#4a5068" : ch24 == null ? "#4a5068" : ch24 >= 0 ? BULL : BEAR }}>
          {noMktData ? "—" : fmtPct(ch24)}
        </span>
      </td>

      {/* 7d % */}
      <td className="py-3 px-3 text-right">
        <span className="text-[11px] font-bold font-mono" style={{ color: noMktData ? "#4a5068" : ch7d == null ? "#4a5068" : ch7d >= 0 ? BULL : BEAR }}>
          {noMktData ? "—" : fmtPct(ch7d)}
        </span>
      </td>

      {/* Market Cap */}
      <td className="py-3 px-3 text-right">
        <span className="text-[11px] font-mono" style={{ color: "#8892a4" }}>{noMktData ? "—" : fmtP(coin.market_cap)}</span>
      </td>

      {/* Volume */}
      <td className="py-3 px-3 text-right">
        <span className="text-[11px] font-mono" style={{ color: "#8892a4" }}>{noMktData ? "—" : fmtP(coin.total_volume)}</span>
      </td>

      {/* Actions */}
      <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-1.5 justify-end">
          <button
            type="button"
            onClick={() => onView(coin.symbol.toUpperCase())}
            className="p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
            style={{ background: "rgba(255,255,255,0.06)" }}
            title="View coin detail"
          >
            <ExternalLink className="h-3 w-3" style={{ color: "#8892a4" }} />
          </button>

          {isAdded ? (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold"
              style={{ background: "rgba(38,166,154,0.15)", color: BULL }}>
              <Check className="h-3 w-3" />
              Added
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onAdd(coin); }}
              disabled={isAdding}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all"
              style={{
                background: isAdding ? "rgba(41,98,255,0.1)" : "rgba(41,98,255,0.18)",
                color: isAdding ? "#4d7fff" : BLUE,
                border: `1px solid ${isAdding ? "rgba(41,98,255,0.2)" : "rgba(41,98,255,0.3)"}`,
              }}
            >
              {isAdding ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Plus className="h-3 w-3" />
              )}
              {isAdding ? "Adding…" : "Add"}
            </button>
          )}
        </div>
      </td>
    </motion.tr>
  );
}

/* ── Main Component ──────────────────────────────────────────────────────── */
export default function Discover() {
  const [, setLocation] = useLocation();

  const [selectedCatId, setSelectedCatId] = useState<string | null>(null); // null = All Coins
  const [catSearch, setCatSearch]         = useState("");
  const [coinSearch, setCoinSearch]       = useState("");
  const [page, setPage]                   = useState(1);
  const [addingId, setAddingId]           = useState<string | null>(null);
  const [justAdded, setJustAdded]         = useState<Set<string>>(new Set());
  const [debouncedCoinSearch, setDebouncedCoinSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedCoinSearch(coinSearch.trim()), 280);
    return () => clearTimeout(t);
  }, [coinSearch]);

  const { data: categories, isLoading: catsLoading } = useCoinCategories();
  const { data: catCoins,   isLoading: catLoading   } = useCategoryCoins(selectedCatId, page);
  const { data: allCoins,   isLoading: allLoading   } = useAllCoins(page);
  const { data: addedSymbols = []                    } = usePlatformTokenSymbols();
  const { data: searchRemote } = useCoinSearch(debouncedCoinSearch.length >= 2 ? debouncedCoinSearch : "");
  const importCoin = useImportCoin();

  const addedSet = useMemo(() => new Set(addedSymbols.map(s => s.toUpperCase())), [addedSymbols]);

  const isLoading = selectedCatId === null ? allLoading : catLoading;
  const rawCoins  = (selectedCatId === null ? allCoins : catCoins) ?? [];

  const searchAsMarkets: CoinMarketItem[] = useMemo(() => {
    if (debouncedCoinSearch.length < 2 || !searchRemote?.coins?.length) return [];
    return searchRemote.coins.map((c) => ({
      id: c.id,
      symbol: c.symbol,
      name: c.name,
      image: c.thumb,
      current_price: 0,
      market_cap: 0,
      market_cap_rank: c.market_cap_rank ?? 0,
      fully_diluted_valuation: null,
      total_volume: 0,
      high_24h: 0,
      low_24h: 0,
      price_change_24h: 0,
      price_change_percentage_24h: 0,
      price_change_percentage_7d_in_currency: undefined,
      circulating_supply: 0,
      total_supply: null,
      ath: 0,
      ath_change_percentage: 0,
    }));
  }, [debouncedCoinSearch, searchRemote]);

  const displayedCoins = useMemo(() => {
    if (debouncedCoinSearch.length >= 2 && searchAsMarkets.length > 0) {
      return searchAsMarkets;
    }
    if (!coinSearch.trim()) return rawCoins;
    const q = coinSearch.toLowerCase();
    return rawCoins.filter(c =>
      c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q)
    );
  }, [rawCoins, coinSearch, debouncedCoinSearch, searchAsMarkets]);

  const filteredCategories = useMemo(() => {
    if (!catSearch.trim()) return categories ?? [];
    const q = catSearch.toLowerCase();
    return (categories ?? []).filter(c => c.name.toLowerCase().includes(q));
  }, [categories, catSearch]);

  const selectedCat = categories?.find(c => c.id === selectedCatId) ?? null;

  useEffect(() => {
    setPage(1);
    setCoinSearch("");
  }, [selectedCatId]);

  async function handleAdd(coin: CoinMarketItem) {
    setAddingId(coin.id);
    try {
      const result = await importCoin.mutateAsync(coin);
      setJustAdded(prev => new Set([...prev, coin.symbol.toUpperCase()]));
      if (result.imported) {
        // brief flash then settled state handled by addedSet
      }
    } catch {
      // silently fail — user can retry
    } finally {
      setAddingId(null);
    }
  }

  const isAdded = (coin: CoinMarketItem) =>
    addedSet.has(coin.symbol.toUpperCase()) || justAdded.has(coin.symbol.toUpperCase());

  const totalCats   = categories?.length ?? 0;
  const addedCount  = addedSymbols.length;

  return (
    <div className="min-h-screen" style={{ background: "#070a12", paddingBottom: 48 }}>
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 pt-6 pb-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Globe className="h-5 w-5" style={{ color: BLUE }} />
              <h1 className="text-[22px] font-black text-white tracking-tight">Coin Universe</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(41,98,255,0.15)", color: BLUE }}>
                CoinAstra Market Feed
              </span>
            </div>
            <p className="text-[12px]" style={{ color: "#4a5068" }}>
              Browse 15,000+ coins across {totalCats} categories — add any coin to CoinAstra for AI analysis
            </p>
          </div>

          {/* Stats pills */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
              style={{ background: "rgba(13,17,26,0.95)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <Layers className="h-3.5 w-3.5" style={{ color: "#7c3aed" }} />
              <span className="text-[11px] font-bold text-white">{totalCats}</span>
              <span className="text-[10px]" style={{ color: "#4a5068" }}>categories</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
              style={{ background: "rgba(13,17,26,0.95)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <Star className="h-3.5 w-3.5" style={{ color: BULL }} />
              <span className="text-[11px] font-bold text-white">{addedCount}</span>
              <span className="text-[10px]" style={{ color: "#4a5068" }}>on platform</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Two-panel layout ─────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 flex flex-col lg:flex-row gap-4 items-start">

        {/* ── Left: Category Sidebar ─────────────────────────────────────── */}
        <div className="flex-shrink-0 w-full lg:w-[230px] rounded-2xl lg:sticky lg:top-4"
          style={{ ...CARD, maxHeight: "min(70vh, 520px)", overflow: "hidden", display: "flex", flexDirection: "column" }}>

          <div className="px-3 pt-3 pb-2 flex-shrink-0">
            <div className="text-[10px] font-bold mb-2 tracking-wider" style={{ color: "#4a5068" }}>
              CATEGORIES {totalCats > 0 && `· ${totalCats}`}
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3" style={{ color: "#4a5068" }} />
              <input
                value={catSearch}
                onChange={e => setCatSearch(e.target.value)}
                placeholder="Search categories…"
                className="w-full text-[11px] pl-6 pr-2 py-1.5 rounded-lg outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff" }}
              />
              {catSearch && (
                <button onClick={() => setCatSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                  <X className="h-3 w-3" style={{ color: "#4a5068" }} />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5"
            style={{ scrollbarWidth: "thin", scrollbarColor: "#2962ff22 transparent" }}>
            {/* All Coins special item */}
            {!catSearch && (
              <>
                <CategoryItem cat={null} selected={selectedCatId === null} onClick={() => setSelectedCatId(null)} />
                <div className="my-1.5 mx-1" style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />
              </>
            )}

            {catsLoading ? (
              Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-8 rounded-xl animate-pulse mx-1"
                  style={{ background: "rgba(255,255,255,0.04)" }} />
              ))
            ) : (
              filteredCategories.map(cat => (
                <CategoryItem
                  key={cat.id}
                  cat={cat}
                  selected={selectedCatId === cat.id}
                  onClick={() => setSelectedCatId(cat.id)}
                />
              ))
            )}

            {filteredCategories.length === 0 && !catsLoading && catSearch && (
              <div className="text-center py-8 text-[11px]" style={{ color: "#4a5068" }}>
                No categories match "{catSearch}"
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Coin Table ──────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 rounded-2xl" style={CARD}>

          {/* Table header bar */}
          <div className="px-5 py-3 flex items-center gap-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {selectedCat ? (
                  <>
                    <div className="flex -space-x-1">
                      {(selectedCat.top_3_coins ?? []).slice(0, 3).map((url, i) => (
                        <img key={i} src={url} alt="" className="w-5 h-5 rounded-full"
                          style={{ border: "1px solid rgba(0,0,0,0.4)" }}
                          onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                      ))}
                    </div>
                    <span className="text-[14px] font-black text-white">{selectedCat.name}</span>
                    {selectedCat.market_cap > 0 && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-lg"
                        style={{
                          background: selectedCat.market_cap_change_24h >= 0 ? "rgba(38,166,154,0.15)" : "rgba(239,83,80,0.15)",
                          color: selectedCat.market_cap_change_24h >= 0 ? BULL : BEAR,
                        }}>
                        {fmtPct(selectedCat.market_cap_change_24h)} 24h mcap
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <Globe className="h-4 w-4" style={{ color: BLUE }} />
                    <span className="text-[14px] font-black text-white">All Coins</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-lg" style={{ background: "rgba(41,98,255,0.12)", color: BLUE }}>
                      Top coins by market cap · Page {page}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Search within current category */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3" style={{ color: "#4a5068" }} />
              <input
                value={coinSearch}
                onChange={e => setCoinSearch(e.target.value)}
                placeholder="Search coins (min 2 chars) or filter this page…"
                className="text-[11px] pl-7 pr-7 py-1.5 rounded-lg outline-none w-40"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff" }}
              />
              {coinSearch && (
                <button onClick={() => setCoinSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                  <X className="h-3 w-3" style={{ color: "#4a5068" }} />
                </button>
              )}
            </div>

            {/* Page count */}
            <div className="text-[10px]" style={{ color: "#4a5068" }}>
              {displayedCoins.length} coins
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="px-5 py-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-3 border-b animate-pulse"
                  style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                  <div className="w-6 h-3 rounded" style={{ background: "rgba(255,255,255,0.05)" }} />
                  <div className="w-7 h-7 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }} />
                  <div className="flex-1 space-y-1.5">
                    <div className="w-28 h-3 rounded" style={{ background: "rgba(255,255,255,0.07)" }} />
                    <div className="w-12 h-2 rounded" style={{ background: "rgba(255,255,255,0.04)" }} />
                  </div>
                  <div className="w-16 h-3 rounded" style={{ background: "rgba(255,255,255,0.05)" }} />
                  <div className="w-12 h-3 rounded" style={{ background: "rgba(255,255,255,0.05)" }} />
                  <div className="w-12 h-3 rounded" style={{ background: "rgba(255,255,255,0.05)" }} />
                  <div className="w-20 h-3 rounded" style={{ background: "rgba(255,255,255,0.05)" }} />
                  <div className="w-16 h-3 rounded" style={{ background: "rgba(255,255,255,0.05)" }} />
                  <div className="w-14 h-6 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }} />
                </div>
              ))}
            </div>
          ) : displayedCoins.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <BarChart2 className="h-10 w-10" style={{ color: "#2a3147" }} />
              <p className="text-[13px]" style={{ color: "#4a5068" }}>
                {coinSearch ? `No coins match "${coinSearch}"` : "No coins found for this category"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    {["#", "Coin", "Price", "24h %", "7d %", "Market Cap", "Volume 24h", ""].map((h, i) => (
                      <th key={i}
                        className="py-2.5 text-[9px] font-bold tracking-wider uppercase"
                        style={{
                          color: "#4a5068",
                          textAlign: i === 0 ? "center" : i >= 5 ? "right" : i === 1 ? "left" : "right",
                          paddingLeft: i === 0 ? "12px" : i === 1 ? "12px" : "12px",
                          paddingRight: "12px",
                        }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayedCoins.map((coin, i) => (
                    <CoinRow
                      key={coin.id}
                      coin={coin}
                      rank={coin.market_cap_rank || (page - 1) * 100 + i + 1}
                      isAdded={isAdded(coin)}
                      onAdd={handleAdd}
                      onView={sym => setLocation(`/research/${sym}`)}
                      addingId={addingId}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!debouncedCoinSearch && (
            <div className="flex items-center justify-between px-5 py-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <span className="text-[10px]" style={{ color: "#4a5068" }}>
                Page {page} · {(page - 1) * 100 + 1}–{(page - 1) * 100 + (displayedCoins.length)}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] transition-all disabled:opacity-30"
                  style={{ background: "rgba(255,255,255,0.06)", color: "#8892a4" }}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev
                </button>
                <div className="flex items-center gap-1">
                  {[page - 1, page, page + 1, page + 2].filter(p => p >= 1 && p <= 50).map(p => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className="w-7 h-7 rounded-lg text-[11px] font-bold transition-all"
                      style={{
                        background: p === page ? BLUE : "rgba(255,255,255,0.05)",
                        color: p === page ? "#fff" : "#4a5068",
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={displayedCoins.length < 100}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] transition-all disabled:opacity-30"
                  style={{ background: "rgba(255,255,255,0.06)", color: "#8892a4" }}
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

