import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Settings2, Sun, Moon, Bell, Key, Shield, Globe, Palette, Sliders,
  Eye, EyeOff, Check, ChevronRight, Monitor, Smartphone, LayoutDashboard,
  Zap, Save,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";

type SettingsTab = "display" | "notifications" | "api" | "security" | "language";

const TABS: { id: SettingsTab; label: string; icon: React.ElementType; color: string }[] = [
  { id: "display",       label: "Display",       icon: Palette,   color: "#2962ff" },
  { id: "notifications", label: "Notifications", icon: Bell,      color: "#f7931a" },
  { id: "api",           label: "API Keys",      icon: Key,       color: "#7c3aed" },
  { id: "security",      label: "Security",      icon: Shield,    color: "#ef5350" },
  { id: "language",      label: "Language",      icon: Globe,     color: "#26a69a" },
];

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)}
      className="w-10 h-6 rounded-full transition-all relative shrink-0"
      style={{ background: on ? "#2962ff" : "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.1)" }}>
      <motion.div animate={{ x: on ? 18 : 2 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm" />
    </button>
  );
}

function SettingRow({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
      <div className="flex-1 min-w-0 mr-4">
        <div className="text-[12px] font-semibold text-white">{label}</div>
        {desc && <div className="text-[10px] mt-0.5" style={{ color: "#5a6072" }}>{desc}</div>}
      </div>
      {children}
    </div>
  );
}

export default function Settings() {
  const [tab, setTab] = useState<SettingsTab>("display");
  const { theme, setTheme } = useTheme();
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  const [notifs, setNotifs] = useState({
    priceAlerts: true, whaleAlerts: true, aiSignals: true,
    news: false, portfolio: true, weeklyReport: true,
  });
  const [display, setDisplay] = useState({
    denseMode: false, showPercent: true, animationsOn: true,
    autoRefresh: true, showRank: true, compactCards: false,
  });
  const [security, setSecurity] = useState({
    twoFactor: false, sessionTimeout: "4h", loginAlerts: true,
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#5a6072,#2962ff)", boxShadow: "0 0 16px rgba(41,98,255,0.3)" }}>
              <Settings2 className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-[22px] font-black tracking-tight text-white">Settings</h1>
          </div>
          <p className="text-[12px]" style={{ color: "#5a6072" }}>Customize your CoinAstra experience</p>
        </div>
        <button onClick={handleSave}
          className="flex items-center gap-1.5 px-4 h-8 rounded-xl text-[11px] font-semibold transition-all"
          style={{
            background: saved ? "rgba(38,166,154,0.2)" : "rgba(41,98,255,0.18)",
            color: saved ? "#26a69a" : "#4d7fff",
            border: `1px solid ${saved ? "rgba(38,166,154,0.35)" : "rgba(41,98,255,0.35)"}`,
          }}>
          {saved ? <><Check className="h-3.5 w-3.5" /> Saved!</> : <><Save className="h-3.5 w-3.5" /> Save Changes</>}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Sidebar Tabs */}
        <div className="rounded-2xl p-2"
          style={{ background: "rgba(13,17,26,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-0.5 transition-all"
              style={{
                background: tab === t.id ? `${t.color}15` : "transparent",
                color: tab === t.id ? t.color : "#5a6072",
                border: tab === t.id ? `1px solid ${t.color}25` : "1px solid transparent",
              }}>
              <t.icon className="h-3.5 w-3.5 shrink-0" />
              <span className="text-[12px] font-semibold">{t.label}</span>
              {tab === t.id && <ChevronRight className="h-3 w-3 ml-auto" />}
            </button>
          ))}
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          <motion.div key={tab} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
            className="rounded-2xl p-5"
            style={{ background: "rgba(13,17,26,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>

            {tab === "display" && (
              <div>
                <h2 className="text-[14px] font-black text-white mb-4">Display Settings</h2>

                {/* Theme */}
                <div className="mb-6">
                  <div className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: "#4a5068" }}>Theme</div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "dark", label: "Dark", icon: Moon, desc: "Bloomberg style" },
                      { id: "light", label: "Light", icon: Sun, desc: "Clean & bright" },
                      { id: "system", label: "System", icon: Monitor, desc: "Auto detect" },
                    ].map(t => (
                      <button key={t.id} onClick={() => setTheme(t.id as "dark"|"light")}
                        className="p-3 rounded-2xl text-left transition-all"
                        style={{
                          background: theme === t.id ? "rgba(41,98,255,0.15)" : "rgba(255,255,255,0.04)",
                          border: theme === t.id ? "1px solid rgba(41,98,255,0.35)" : "1px solid rgba(255,255,255,0.07)",
                        }}>
                        <t.icon className="h-5 w-5 mb-2" style={{ color: theme === t.id ? "#4d7fff" : "#5a6072" }} />
                        <div className="text-[11px] font-bold" style={{ color: theme === t.id ? "white" : "#787b86" }}>{t.label}</div>
                        <div className="text-[9px]" style={{ color: "#4a5068" }}>{t.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: "#4a5068" }}>Interface</div>
                  {Object.entries({
                    denseMode: { label: "Dense Mode", desc: "Compact layout with more data visible" },
                    showPercent: { label: "Show % Changes", desc: "Display percentage changes on all prices" },
                    animationsOn: { label: "Animations", desc: "Enable smooth UI animations and transitions" },
                    autoRefresh: { label: "Auto Refresh", desc: "Automatically refresh market data every 15s" },
                    showRank: { label: "Market Cap Rank", desc: "Show #rank next to coin names" },
                    compactCards: { label: "Compact Cards", desc: "Smaller coin cards with less padding" },
                  }).map(([key, meta]) => (
                    <SettingRow key={key} label={meta.label} desc={meta.desc}>
                      <Toggle on={display[key as keyof typeof display]}
                        onChange={v => setDisplay(d => ({ ...d, [key]: v }))} />
                    </SettingRow>
                  ))}
                </div>
              </div>
            )}

            {tab === "notifications" && (
              <div>
                <h2 className="text-[14px] font-black text-white mb-4">Notification Settings</h2>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: "#4a5068" }}>Alert Types</div>
                  {Object.entries({
                    priceAlerts: { label: "Price Alerts", desc: "Get notified when coins hit your target price" },
                    whaleAlerts: { label: "Whale Alerts", desc: "Large wallet movements on tracked coins" },
                    aiSignals: { label: "AI Signals", desc: "New AI-generated buy/sell/watch signals" },
                    news: { label: "Breaking News", desc: "High-impact crypto news and market events" },
                    portfolio: { label: "Portfolio Alerts", desc: "Significant PnL changes in your portfolio" },
                    weeklyReport: { label: "Weekly AI Report", desc: "Weekly AI market digest every Sunday" },
                  }).map(([key, meta]) => (
                    <SettingRow key={key} label={meta.label} desc={meta.desc}>
                      <Toggle on={notifs[key as keyof typeof notifs]}
                        onChange={v => setNotifs(n => ({ ...n, [key]: v }))} />
                    </SettingRow>
                  ))}
                </div>
                <div className="mt-5">
                  <div className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: "#4a5068" }}>Delivery Method</div>
                  <div className="grid grid-cols-2 gap-2">
                    {["In-App", "Browser Push", "Email", "Telegram"].map((m, i) => (
                      <button key={m} className="p-3 rounded-xl flex items-center gap-2 transition-all"
                        style={{
                          background: i < 2 ? "rgba(41,98,255,0.15)" : "rgba(255,255,255,0.04)",
                          border: i < 2 ? "1px solid rgba(41,98,255,0.3)" : "1px solid rgba(255,255,255,0.07)",
                        }}>
                        {i < 2 && <Check className="h-3.5 w-3.5" style={{ color: "#4d7fff" }} />}
                        <span className="text-[11px] font-semibold" style={{ color: i < 2 ? "white" : "#5a6072" }}>{m}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === "api" && (
              <div>
                <h2 className="text-[14px] font-black text-white mb-4">API Keys</h2>
                <div className="space-y-4">
                  {[
                    { label: "CoinGecko API Key", desc: "For higher rate limits on market data", key: "CG-xxxx-xxxx-xxxx-xxxx", status: "Free Tier", color: "#f7931a" },
                    { label: "Etherscan API Key", desc: "For on-chain Ethereum analytics", key: "ETHERSCAN-xxxx-xxxx", status: "Not Set", color: "#5a6072" },
                    { label: "Nansen API Key", desc: "For smart money wallet data", key: "", status: "Pro Required", color: "#7c3aed" },
                    { label: "OpenAI API Key", desc: "For extended AI analysis features", key: "", status: "Not Set", color: "#5a6072" },
                  ].map((api, i) => (
                    <div key={i} className="p-4 rounded-2xl"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="text-[12px] font-bold text-white">{api.label}</div>
                          <div className="text-[10px]" style={{ color: "#5a6072" }}>{api.desc}</div>
                        </div>
                        <span className="text-[9px] px-2 py-0.5 rounded-lg font-bold"
                          style={{ background: `${api.color}15`, color: api.color }}>{api.status}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 px-3 py-2 rounded-xl text-[11px] font-mono"
                          style={{ background: "rgba(255,255,255,0.04)", color: "#5a6072", border: "1px solid rgba(255,255,255,0.07)" }}>
                          {api.key ? (showKey ? api.key : "●●●●●●●●●●●●●●●●") : "Not configured"}
                        </div>
                        {api.key && (
                          <button onClick={() => setShowKey(s => !s)} className="p-2 rounded-xl hover:bg-white/5">
                            {showKey ? <EyeOff className="h-3.5 w-3.5" style={{ color: "#5a6072" }} />
                              : <Eye className="h-3.5 w-3.5" style={{ color: "#5a6072" }} />}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "security" && (
              <div>
                <h2 className="text-[14px] font-black text-white mb-4">Security Settings</h2>
                <div>
                  <SettingRow label="Two-Factor Authentication" desc="Adds extra security layer to your account">
                    <Toggle on={security.twoFactor} onChange={v => setSecurity(s => ({ ...s, twoFactor: v }))} />
                  </SettingRow>
                  <SettingRow label="Login Alerts" desc="Email alert when your account is accessed">
                    <Toggle on={security.loginAlerts} onChange={v => setSecurity(s => ({ ...s, loginAlerts: v }))} />
                  </SettingRow>
                  <SettingRow label="Session Timeout" desc="Automatically log out after inactivity">
                    <select className="px-3 py-1.5 rounded-xl text-[11px] outline-none cursor-pointer"
                      style={{ background: "rgba(255,255,255,0.06)", color: "#d1d4dc", border: "1px solid rgba(255,255,255,0.1)" }}
                      value={security.sessionTimeout}
                      onChange={e => setSecurity(s => ({ ...s, sessionTimeout: e.target.value }))}>
                      {["1h","4h","8h","24h","Never"].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </SettingRow>
                </div>
                <div className="mt-5 p-4 rounded-2xl"
                  style={{ background: "rgba(239,83,80,0.06)", border: "1px solid rgba(239,83,80,0.15)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4" style={{ color: "#ef5350" }} />
                    <span className="text-[12px] font-bold text-white">Security Score: 62/100</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden mb-2" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full" style={{ width: "62%", background: "linear-gradient(90deg,#f7931a,#ef5350)" }} />
                  </div>
                  <p className="text-[10px]" style={{ color: "#787b86" }}>Enable 2FA to improve your security score to 90+</p>
                </div>
              </div>
            )}

            {tab === "language" && (
              <div>
                <h2 className="text-[14px] font-black text-white mb-4">Language & Region</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { lang: "English (US)", flag: "🇺🇸", active: true },
                    { lang: "English (UK)", flag: "🇬🇧" },
                    { lang: "Spanish", flag: "🇪🇸" },
                    { lang: "Chinese (简体)", flag: "🇨🇳" },
                    { lang: "Japanese", flag: "🇯🇵" },
                    { lang: "Korean", flag: "🇰🇷" },
                    { lang: "German", flag: "🇩🇪" },
                    { lang: "French", flag: "🇫🇷" },
                    { lang: "Arabic", flag: "🇸🇦" },
                  ].map(l => (
                    <button key={l.lang} className="p-3 rounded-xl text-left transition-all"
                      style={{
                        background: l.active ? "rgba(41,98,255,0.15)" : "rgba(255,255,255,0.04)",
                        border: l.active ? "1px solid rgba(41,98,255,0.35)" : "1px solid rgba(255,255,255,0.07)",
                      }}>
                      <div className="text-[18px] mb-1">{l.flag}</div>
                      <div className="text-[11px] font-semibold" style={{ color: l.active ? "white" : "#787b86" }}>{l.lang}</div>
                      {l.active && <div className="text-[8px] mt-0.5" style={{ color: "#4d7fff" }}>Active</div>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
