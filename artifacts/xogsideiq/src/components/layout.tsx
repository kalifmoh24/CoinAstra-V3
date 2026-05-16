import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Activity, LayoutDashboard, BarChart2, Compass, BookOpen, Briefcase,
  TrendingUp, Sun, Moon, ChevronLeft, ChevronRight, Globe,
  Brain, Waves, Network, ScanLine, Newspaper, Star, Bell, LayoutGrid,
  GraduationCap, Settings2, User, Sparkles, Zap, Search, X,
  Layers, Coins, Calendar, Building2, Gamepad2, Shield, BarChart, TrendingDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MobileNav } from "@/components/mobile-nav";
import { NotificationCenter } from "@/components/notification-center";
import { GlobalTicker } from "@/components/global-ticker";
import { useTheme } from "@/components/theme-provider";
import { useFearGreedLive, useLiveCoins } from "@/hooks/use-market-data";
import { useGetMarketOverview, getGetMarketOverviewQueryKey } from "@workspace/api-client-react";
import { researchHref } from "@/lib/research-url";

async function fetchCoinSearch(q: string) {
  const res = await fetch(`/api/coins/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) return { coins: [] };
  return res.json() as Promise<{ coins: Array<{ id: string; name: string; symbol: string; market_cap_rank: number | null; thumb: string }> }>;
}

const NAV_SECTIONS = [
  {
    label: "MAIN",
    items: [
      { path: "/",            label: "Dashboard",     icon: LayoutDashboard, color: "#2962ff" },
      { path: "/markets",     label: "Markets",       icon: BarChart2,       color: "#26a69a" },
      { path: "/watchlist",   label: "Watchlist",     icon: Star,            color: "#f7931a" },
    ],
  },
  {
    label: "INTELLIGENCE",
    items: [
      { path: "/ai-insights",   label: "AI Insights",   icon: Brain,    color: "#7c3aed" },
      { path: "/screener",      label: "AI Screener",   icon: ScanLine, color: "#f7931a" },
      { path: "/whale-tracker", label: "Whale Tracker", icon: Waves,    color: "#0ea5e9" },
      { path: "/on-chain",      label: "On-Chain",      icon: Network,  color: "#10b981" },
    ],
  },
  {
    label: "MARKETS",
    items: [
      { path: "/narratives", label: "Narratives",  icon: Sparkles,   color: "#7c3aed" },
      { path: "/news",       label: "News",        icon: Newspaper,  color: "#0ea5e9" },
      { path: "/heatmap",    label: "Heatmap",     icon: LayoutGrid, color: "#2962ff" },
    ],
  },
  {
    label: "TRADING",
    items: [
      { path: "/signals",   label: "AI Signals",  icon: Zap,       color: "#26a69a" },
      { path: "/portfolio", label: "Portfolio",   icon: Briefcase, color: "#2962ff" },
      { path: "/alerts",    label: "Alerts",      icon: Bell,      color: "#ef5350" },
    ],
  },
  {
    label: "MORE",
    items: [
      { path: "/discover",  label: "Discover",    icon: Globe,         color: "#2962ff" },
      { path: "/research",  label: "Research",    icon: Compass,       color: "#7c3aed" },
      { path: "/learn",     label: "Academy",     icon: GraduationCap, color: "#0ea5e9" },
      { path: "/settings",  label: "Settings",    icon: Settings2,     color: "#5a6072" },
      { path: "/profile",   label: "Profile",     icon: User,          color: "#5a6072" },
    ],
  },
];

const ALL_NAV = NAV_SECTIONS.flatMap(s => s.items);

const PAGE_SUGGESTIONS = [
  { label: "Dashboard", sub: "Home overview", path: "/" },
  { label: "Markets", sub: "Live coin table", path: "/markets" },
  { label: "AI Insights", sub: "Intelligence page", path: "/ai-insights" },
  { label: "Whale Tracker", sub: "Live whale feed", path: "/whale-tracker" },
  { label: "Heatmap", sub: "Visual market map", path: "/heatmap" },
  { label: "Portfolio", sub: "Your holdings", path: "/portfolio" },
  { label: "Narratives", sub: "Sector analysis", path: "/narratives" },
  { label: "Signals", sub: "AI trading signals", path: "/signals" },
  { label: "Screener", sub: "AI screener", path: "/screener" },
  { label: "Discover", sub: "Browse all coins", path: "/discover" },
];

function fmtL(n: number) {
  if (!n) return "—";
  if (n >= 1e12) return "$" + (n / 1e12).toFixed(2) + "T";
  if (n >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
  return "$" + n.toLocaleString();
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { theme, setTheme } = useTheme();
  const isDark = theme !== "light";
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [now, setNow] = useState(new Date());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 280);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  const { data: searchData, isFetching: searchFetching } = useQuery({
    queryKey: ["coin-search-layout", debouncedQuery],
    queryFn: () => fetchCoinSearch(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 30_000,
  });

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Market data for top nav
  const { data: fearGreedData } = useFearGreedLive();
  const { data: cgCoins } = useLiveCoins();
  const { data: overview } = useGetMarketOverview({ query: { queryKey: getGetMarketOverviewQueryKey() } });

  const fg = fearGreedData?.data?.[0];
  const fgVal = fg ? parseInt(fg.value) : (overview?.fearGreedIndex ?? 42);
  const fgLabel = fg?.value_classification ?? "Fear";
  const fgColor = fgVal < 25 ? "#ef5350" : fgVal < 45 ? "#f7931a" : fgVal < 55 ? "#787b86" : "#26a69a";
  const btcCoin = cgCoins?.find(c => c.id === "bitcoin");
  const ethCoin = cgCoins?.find(c => c.id === "ethereum");

  const isActive = (path: string) =>
    location === path || (path !== "/" && location.startsWith(path));
  const currentPage = ALL_NAV.find(n => isActive(n.path));

  const coinResults = searchData?.coins ?? [];
  const hasQuery = searchQuery.trim().length >= 2;
  const pageSuggestions = PAGE_SUGGESTIONS.filter(s =>
    !searchQuery || s.label.toLowerCase().includes(searchQuery.toLowerCase()) || s.sub.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, hasQuery ? 3 : 6);

  // Close search on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") { setSearchOpen(false); setSearchQuery(""); } };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <GlobalTicker />

      {/* ── PREMIUM TOP HEADER ─────────────────────────────────────────── */}
      <header
        className="shrink-0 z-40"
        style={{
          background: isDark ? "rgba(5,8,16,0.98)" : "rgba(243,246,252,0.98)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "0 2px 24px rgba(0,0,0,0.3)",
        }}>

        {/* Row 1: Main nav bar */}
        <div className="h-12 flex items-center px-4 gap-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <motion.div
              animate={{ boxShadow: ["0 0 10px rgba(41,98,255,0.4)", "0 0 20px rgba(41,98,255,0.7)", "0 0 10px rgba(41,98,255,0.4)"] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              className="w-7 h-7 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#2962ff,#7c3aed)" }}>
              <Activity className="h-3.5 w-3.5 text-white" />
            </motion.div>
            <span className="hidden sm:inline text-[15px] font-black tracking-tight text-foreground">
              Coin<span style={{ color: "#2962ff" }}>Astra</span>
            </span>
          </Link>

          {/* Search bar (desktop) */}
          <div className="hidden md:block relative flex-1 max-w-xs">
            <div
              className="flex items-center gap-2 h-8 px-3 rounded-xl cursor-pointer transition-all"
              style={{
                background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
                border: `1px solid ${searchOpen ? "rgba(41,98,255,0.4)" : "rgba(255,255,255,0.08)"}`,
              }}
              onClick={() => setSearchOpen(true)}>
              <Search className="h-3 w-3" style={{ color: "#5a6072" }} />
              {searchOpen ? (
                <input
                  autoFocus
                  className="flex-1 text-[11px] bg-transparent outline-none"
                  style={{ color: isDark ? "white" : "#0d1117" }}
                  placeholder="Search coins, pages..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span className="text-[11px]" style={{ color: "#5a6072" }}>Search markets, AI, tools…</span>
              )}
              {searchOpen && <span className="text-[8px] px-1 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.08)", color: "#5a6072" }}>ESC</span>}
            </div>
            {/* Search dropdown */}
            <AnimatePresence>
              {searchOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  className="absolute top-10 left-0 w-72 rounded-2xl overflow-hidden z-50 py-1"
                  style={{
                    background: isDark ? "rgba(8,12,24,0.98)" : "rgba(248,250,255,0.98)",
                    border: "1px solid rgba(41,98,255,0.2)",
                    boxShadow: "0 16px 48px rgba(0,0,0,0.4)",
                    backdropFilter: "blur(24px)",
                  }}>
                  <div className="px-3 py-1.5 border-b flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#3a4058" }}>
                      {hasQuery ? "Live Search" : "Quick Navigation"}
                    </span>
                    {searchFetching && <span className="text-[8px]" style={{ color: "#5a6072" }}>Searching…</span>}
                  </div>

                  {/* Coin results from CoinGecko */}
                  {hasQuery && coinResults.length > 0 && (
                    <>
                      <div className="px-3 pt-2 pb-0.5">
                        <span className="text-[8px] font-black uppercase tracking-wider" style={{ color: "#3a4058" }}>Coins</span>
                      </div>
                      {coinResults.slice(0, 8).map((coin, i) => (
                        <div key={coin.id}
                          className="flex items-center gap-3 px-3 py-2 transition-all cursor-pointer hover:bg-white/[0.04]"
                          onClick={() => { setLocation(researchHref({ id: coin.id, symbol: coin.symbol })); setSearchOpen(false); setSearchQuery(""); }}>
                          <img src={coin.thumb} alt={coin.name} className="w-6 h-6 rounded-full shrink-0"
                            onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-semibold text-foreground truncate">{coin.name}</div>
                            <div className="text-[9px] flex items-center gap-1" style={{ color: "#4a5268" }}>
                              <span className="uppercase font-mono">{coin.symbol}</span>
                              {coin.market_cap_rank && <span>· #{coin.market_cap_rank}</span>}
                            </div>
                          </div>
                          <ChevronRight className="h-3 w-3 shrink-0" style={{ color: "#3a4058" }} />
                        </div>
                      ))}
                    </>
                  )}

                  {/* Page suggestions */}
                  {pageSuggestions.length > 0 && (
                    <>
                      {hasQuery && coinResults.length > 0 && (
                        <div className="px-3 pt-2 pb-0.5 border-t mt-1" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                          <span className="text-[8px] font-black uppercase tracking-wider" style={{ color: "#3a4058" }}>Pages</span>
                        </div>
                      )}
                      {pageSuggestions.map((s, i) => (
                        <Link key={i} href={s.path} onClick={() => { setSearchOpen(false); setSearchQuery(""); }}>
                          <div className="flex items-center gap-3 px-3 py-2 transition-all cursor-pointer hover:bg-white/[0.04]">
                            <Search className="h-3 w-3 shrink-0" style={{ color: "#3a4058" }} />
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] font-semibold text-foreground">{s.label}</div>
                              <div className="text-[9px]" style={{ color: "#4a5268" }}>{s.sub}</div>
                            </div>
                            <ChevronRight className="h-3 w-3" style={{ color: "#3a4058" }} />
                          </div>
                        </Link>
                      ))}
                    </>
                  )}

                  {hasQuery && !searchFetching && coinResults.length === 0 && pageSuggestions.length === 0 && (
                    <div className="px-3 py-6 text-center">
                      <span className="text-[11px]" style={{ color: "#5a6072" }}>No results for "{searchQuery}"</span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            {searchOpen && <div className="fixed inset-0 z-40" onClick={() => { setSearchOpen(false); setSearchQuery(""); }} />}
          </div>

          {/* Desktop quick nav links */}
          <nav className="hidden lg:flex items-center gap-0.5 flex-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {ALL_NAV.slice(0, 7).map(item => {
              const active = isActive(item.path);
              return (
                <Link key={item.path} href={item.path}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all whitespace-nowrap"
                  style={{
                    color: active ? item.color : "#5a6072",
                    background: active ? `${item.color}15` : "transparent",
                    boxShadow: active ? `0 0 12px ${item.color}20` : "none",
                  }}>
                  <item.icon className="h-3 w-3" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Mobile: page label */}
          <div className="md:hidden flex items-center gap-2 flex-1 min-w-0">
            {currentPage && (
              <>
                <currentPage.icon className="h-3.5 w-3.5 shrink-0" style={{ color: currentPage.color }} />
                <span className="text-xs font-bold text-foreground truncate">{currentPage.label}</span>
              </>
            )}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1 ml-auto shrink-0">
            {/* AI Score pill */}
            <div className="hidden xl:flex items-center gap-1.5 px-2 py-1 rounded-lg"
              style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.2)" }}>
              <Brain className="h-3 w-3" style={{ color: "#a78bfa" }} />
              <span className="text-[9px] font-black" style={{ color: "#a78bfa" }}>AI 91</span>
            </div>
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:bg-secondary"
              style={{ color: "#5a6072" }}>
              {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
            <NotificationCenter />
            <Link href="/profile">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-all hover:bg-secondary"
                style={{ color: "#5a6072" }}>
                <User className="h-3.5 w-3.5" />
              </div>
            </Link>
          </div>
        </div>

        {/* Row 2: Market metrics strip (desktop only) */}
        <div className="hidden md:flex items-center gap-5 px-4 py-1.5 border-t overflow-x-auto"
          style={{ borderColor: "rgba(255,255,255,0.05)", scrollbarWidth: "none" }}>
          {[
            { label: "BTC", value: btcCoin ? `$${btcCoin.current_price.toLocaleString("en", { maximumFractionDigits: 0 })}` : "$—", change: btcCoin?.price_change_percentage_24h, color: "#f7931a" },
            { label: "ETH", value: ethCoin ? `$${ethCoin.current_price.toLocaleString("en", { maximumFractionDigits: 2 })}` : "$—", change: ethCoin?.price_change_percentage_24h, color: "#627EEA" },
            { label: "MCap", value: fmtL(overview?.totalMarketCap ?? 2_780_000_000_000), change: 0.3, color: "#2962ff" },
            { label: "Vol 24h", value: fmtL(overview?.totalVolume24h ?? 96_000_000_000), change: undefined, color: "#26a69a" },
            { label: "BTC Dom", value: `${overview?.btcDominance?.toFixed(1) ?? "58.3"}%`, change: undefined, color: "#f7931a" },
            { label: "Gas", value: "18 Gwei", change: undefined, color: "#627EEA" },
            { label: "F&G", value: `${fgVal} · ${fgLabel}`, change: undefined, color: fgColor },
            { label: "UTC", value: now.toUTCString().slice(17, 25), change: undefined, color: "#5a6072" },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-1.5 shrink-0">
              <span className="text-[8px] font-black uppercase tracking-wider" style={{ color: "#2a3050" }}>{s.label}</span>
              <span className="text-[9px] font-mono font-bold" style={{ color: s.color }}>{s.value}</span>
              {s.change !== undefined && (
                <span className="text-[8px] font-bold" style={{ color: s.change >= 0 ? "#26a69a" : "#ef5350" }}>
                  {s.change >= 0 ? "+" : ""}{s.change.toFixed(1)}%
                </span>
              )}
            </div>
          ))}
        </div>
      </header>

      {/* ── MAIN BODY: sidebar + content ───────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar (tablet+) */}
        <motion.aside
          animate={{ width: sidebarCollapsed ? 52 : 192 }}
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
          className="hidden md:flex shrink-0 flex-col border-r border-border overflow-hidden"
          style={{ background: isDark ? "rgba(5,8,16,0.98)" : "rgba(243,246,252,0.98)" }}>

          <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2" style={{ scrollbarWidth: "none" }}>
            {NAV_SECTIONS.map(section => (
              <div key={section.label} className="mb-1">
                {!sidebarCollapsed && (
                  <div className="px-3.5 pt-3 pb-1">
                    <span className="text-[8px] font-black tracking-widest uppercase" style={{ color: "#1e2438" }}>
                      {section.label}
                    </span>
                  </div>
                )}
                {sidebarCollapsed && <div className="h-2" />}

                {section.items.map(item => {
                  const active = isActive(item.path);
                  return (
                    <Link key={item.path} href={item.path}>
                      <motion.div
                        className="flex items-center gap-2.5 mx-1.5 my-0.5 px-2.5 py-2 rounded-xl cursor-pointer transition-all"
                        style={{
                          color: active ? item.color : "#5a6072",
                          background: active ? `${item.color}14` : "transparent",
                          border: active ? `1px solid ${item.color}22` : "1px solid transparent",
                        }}
                        whileHover={{ background: active ? `${item.color}14` : "rgba(255,255,255,0.04)" }}
                        whileTap={{ scale: 0.97 }}
                        title={sidebarCollapsed ? item.label : undefined}>
                        <item.icon
                          className="h-3.5 w-3.5 shrink-0"
                          style={{ filter: active ? `drop-shadow(0 0 5px ${item.color}80)` : "none" }} />
                        <AnimatePresence>
                          {!sidebarCollapsed && (
                            <motion.span
                              initial={{ opacity: 0, width: 0 }}
                              animate={{ opacity: 1, width: "auto" }}
                              exit={{ opacity: 0, width: 0 }}
                              transition={{ duration: 0.12 }}
                              className="text-[11px] font-semibold whitespace-nowrap overflow-hidden">
                              {item.label}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Collapse toggle */}
          <div className="px-1.5 py-2 border-t border-border">
            <button
              onClick={() => setSidebarCollapsed(c => !c)}
              className="w-full flex items-center justify-center py-2 rounded-xl transition-all hover:bg-secondary"
              style={{ color: "#5a6072" }}>
              {sidebarCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
            </button>
          </div>
        </motion.aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-24 md:pb-4 ca-minw-0">
          {children}
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
