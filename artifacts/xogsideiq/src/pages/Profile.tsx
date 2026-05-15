import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  User, Shield, Wallet, Bell, Star, Activity, TrendingUp, Zap,
  CheckCircle2, ChevronRight, Edit3, Copy, ExternalLink, Award,
  Clock, BarChart2, BookOpen, Settings2,
} from "lucide-react";

const ACTIVITY_LOG = [
  { action: "Added SOL to watchlist", time: "2h ago", icon: Star, color: "#f7931a" },
  { action: "BTC price alert triggered ($67,000)", time: "5h ago", icon: Bell, color: "#ef5350" },
  { action: "Completed 'Technical Analysis' lesson", time: "1d ago", icon: BookOpen, color: "#2962ff" },
  { action: "Portfolio updated: Added RNDR position", time: "2d ago", icon: TrendingUp, color: "#26a69a" },
  { action: "AI signal: SOL STRONG BUY", time: "3d ago", icon: Zap, color: "#7c3aed" },
  { action: "Whale alert: 215K SOL moved", time: "4d ago", icon: Activity, color: "#0ea5e9" },
  { action: "Created price alert: ETH > $3,500", time: "5d ago", icon: Bell, color: "#f7931a" },
  { action: "Viewed LINK token research", time: "6d ago", icon: ChevronRight, color: "#5a6072" },
];

const CONNECTED_WALLETS = [
  { address: "0x3a8fD22e4b9...d92c", chain: "Ethereum", balance: "$42,180", label: "Main Wallet" },
  { address: "7xKf3b8n...qW1Z", chain: "Solana", balance: "$12,840", label: "Trading Wallet" },
];

const SUBSCRIPTION_FEATURES = [
  { name: "AI Predictions", available: true },
  { name: "Whale Tracker", available: true },
  { name: "AI Screener", available: true },
  { name: "On-Chain Analytics", available: true },
  { name: "Portfolio AI", available: true },
  { name: "Real-time Alerts", available: true },
  { name: "Advanced API Access", available: false },
  { name: "Priority Support", available: false },
];

export default function Profile() {
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#2962ff,#7c3aed)", boxShadow: "0 0 16px rgba(41,98,255,0.4)" }}>
              <User className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-[22px] font-black tracking-tight text-white">User Profile</h1>
          </div>
          <p className="text-[12px]" style={{ color: "#5a6072" }}>Manage your account, subscription, and connected wallets</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Profile Card */}
        <div className="space-y-4">
          {/* Avatar + Info */}
          <div className="rounded-2xl p-5 text-center"
            style={{ background: "linear-gradient(135deg,rgba(41,98,255,0.12),rgba(124,58,237,0.1))", border: "1px solid rgba(41,98,255,0.2)" }}>
            <div className="relative inline-block mb-3">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto"
                style={{ background: "linear-gradient(135deg,#2962ff,#7c3aed)", boxShadow: "0 0 24px rgba(41,98,255,0.4)" }}>
                <span className="text-[32px] font-black text-white">C</span>
              </div>
              <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                style={{ background: "rgba(41,98,255,0.9)", border: "2px solid rgba(7,10,18,0.8)" }}>
                <Edit3 className="h-3 w-3 text-white" />
              </button>
            </div>
            <div className="text-[16px] font-black text-white mb-0.5">CryptoTrader_Pro</div>
            <div className="text-[11px]" style={{ color: "#787b86" }}>crypto@example.com</div>
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black"
                style={{ background: "linear-gradient(90deg,rgba(247,147,26,0.2),rgba(239,83,80,0.15))", color: "#f7931a", border: "1px solid rgba(247,147,26,0.3)" }}>
                <Award className="h-2.5 w-2.5" /> PRO MEMBER
              </span>
            </div>
            <div className="text-[9px] mt-2" style={{ color: "#3a4058" }}>Member since March 2024</div>
          </div>

          {/* Quick Stats */}
          <div className="rounded-2xl p-4"
            style={{ background: "rgba(13,17,26,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Watchlist", value: "8", icon: Star, color: "#f7931a" },
                { label: "Alerts", value: "10", icon: Bell, color: "#2962ff" },
                { label: "Signals Received", value: "142", icon: Zap, color: "#7c3aed" },
                { label: "Courses Done", value: "1", icon: BookOpen, color: "#26a69a" },
              ].map(stat => (
                <div key={stat.label} className="p-3 rounded-xl text-center"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <stat.icon className="h-4 w-4 mx-auto mb-1" style={{ color: stat.color, fill: stat.color === "#f7931a" ? "#f7931a" : "none" }} />
                  <div className="text-[18px] font-black" style={{ color: stat.color }}>{stat.value}</div>
                  <div className="text-[9px]" style={{ color: "#4a5068" }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Subscription */}
          <div className="rounded-2xl p-4"
            style={{ background: "rgba(13,17,26,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Award className="h-3.5 w-3.5" style={{ color: "#f7931a" }} />
              <span className="text-[12px] font-bold text-white">Subscription</span>
            </div>
            <div className="p-3 rounded-xl mb-3"
              style={{ background: "linear-gradient(135deg,rgba(247,147,26,0.12),rgba(239,83,80,0.08))", border: "1px solid rgba(247,147,26,0.2)" }}>
              <div className="text-[14px] font-black" style={{ color: "#f7931a" }}>PRO Plan</div>
              <div className="text-[10px]" style={{ color: "#787b86" }}>$29/month · Renews Jun 1, 2025</div>
            </div>
            <div className="space-y-1.5">
              {SUBSCRIPTION_FEATURES.map(f => (
                <div key={f.name} className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 shrink-0"
                    style={{ color: f.available ? "#26a69a" : "#3a4058" }} />
                  <span className="text-[10px]"
                    style={{ color: f.available ? "#d1d4dc" : "#3a4058" }}>{f.name}</span>
                  {!f.available && (
                    <span className="ml-auto text-[8px] px-1.5 py-0.5 rounded-md font-bold"
                      style={{ background: "rgba(124,58,237,0.15)", color: "#a78bfa" }}>ELITE</span>
                  )}
                </div>
              ))}
            </div>
            <button className="w-full mt-3 py-2 rounded-xl text-[10px] font-bold transition-all"
              style={{ background: "rgba(124,58,237,0.18)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.3)" }}>
              Upgrade to Elite →
            </button>
          </div>
        </div>

        {/* Right: Wallets + Activity */}
        <div className="lg:col-span-2 space-y-4">
          {/* Connected Wallets */}
          <div className="rounded-2xl p-4"
            style={{ background: "rgba(13,17,26,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wallet className="h-3.5 w-3.5" style={{ color: "#26a69a" }} />
                <span className="text-[12px] font-bold text-white">Connected Wallets</span>
              </div>
              <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all hover:bg-white/5"
                style={{ color: "#4d7fff", border: "1px solid rgba(41,98,255,0.2)" }}>
                <span>+</span> Connect
              </button>
            </div>
            <div className="space-y-2">
              {CONNECTED_WALLETS.map((w, i) => (
                <div key={i} className="p-4 rounded-2xl flex items-center gap-3"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "rgba(38,166,154,0.15)" }}>
                    <Wallet className="h-4 w-4" style={{ color: "#26a69a" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[12px] font-bold text-white">{w.label}</span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded-md"
                        style={{ background: "rgba(255,255,255,0.06)", color: "#5a6072" }}>{w.chain}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono" style={{ color: "#5a6072" }}>{w.address}</span>
                      <button onClick={() => handleCopy(w.address)} className="p-0.5 rounded transition-all hover:bg-white/5">
                        {copied ? <CheckCircle2 className="h-2.5 w-2.5" style={{ color: "#26a69a" }} />
                          : <Copy className="h-2.5 w-2.5" style={{ color: "#3a4058" }} />}
                      </button>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[13px] font-black text-white">{w.balance}</div>
                    <a href="#" className="flex items-center gap-1 text-[9px] justify-end mt-0.5" style={{ color: "#4d7fff" }}>
                      View <ExternalLink className="h-2 w-2" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="rounded-2xl p-4"
            style={{ background: "rgba(13,17,26,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-3.5 w-3.5" style={{ color: "#2962ff" }} />
              <span className="text-[12px] font-bold text-white">Activity History</span>
            </div>
            <div className="space-y-0.5">
              {ACTIVITY_LOG.map((item, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 py-2.5 border-b transition-colors cursor-pointer rounded-lg px-2 hover:bg-white/5"
                  style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${item.color}15` }}>
                    <item.icon className="h-3 w-3" style={{ color: item.color }} />
                  </div>
                  <span className="flex-1 text-[11px]" style={{ color: "#d1d4dc" }}>{item.action}</span>
                  <div className="flex items-center gap-1 shrink-0" style={{ color: "#3a4058" }}>
                    <Clock className="h-2.5 w-2.5" />
                    <span className="text-[9px] font-mono">{item.time}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Security summary */}
          <div className="rounded-2xl p-4"
            style={{ background: "rgba(13,17,26,0.85)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-3.5 w-3.5" style={{ color: "#ef5350" }} />
              <span className="text-[12px] font-bold text-white">Account Security</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[
                { label: "Email Verified", ok: true },
                { label: "2FA Enabled", ok: false },
                { label: "Password Strength", ok: true },
                { label: "Login Alerts", ok: true },
                { label: "Active Sessions", ok: true },
                { label: "API Keys Secure", ok: true },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2 p-2.5 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${s.ok ? "rgba(38,166,154,0.15)" : "rgba(239,83,80,0.2)"}` }}>
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: s.ok ? "#26a69a" : "#ef5350" }} />
                  <span className="text-[10px] font-semibold" style={{ color: s.ok ? "#d1d4dc" : "#ef9090" }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
