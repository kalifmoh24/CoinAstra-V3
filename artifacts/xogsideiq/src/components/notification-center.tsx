import React, { useState } from "react";
import { Bell, X, Check, AlertTriangle, TrendingUp, Newspaper, Zap, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Notification {
  id: number;
  type: "price" | "signal" | "alert" | "news";
  icon: React.ElementType;
  color: string;
  title: string;
  desc: string;
  time: string;
  read: boolean;
}

const INITIAL: Notification[] = [
  { id:1, type:"price",  icon:Zap,           color:"#f7931a", title:"BTC crossed $80K",            desc:"Bitcoin broke the $80,000 resistance with a spike in volume. Whale accumulation detected.",   time:"2m ago",  read:false },
  { id:2, type:"signal", icon:TrendingUp,     color:"#26a69a", title:"New BUY Signal: SOL",          desc:"SOL/USDT — AI confidence 87%. Price target $110. Stop-loss at $88.",                          time:"15m ago", read:false },
  { id:3, type:"alert",  icon:AlertTriangle,  color:"#ef5350", title:"Fear & Greed: Extreme Fear",   desc:"Index dropped to 18 — historically a strong accumulation zone for long-term holders.",         time:"1h ago",  read:false },
  { id:4, type:"news",   icon:Newspaper,      color:"#2962ff", title:"ETH staking upgrade confirmed", desc:"Ethereum Foundation confirms major staking improvements shipping Q3 2025.",                    time:"3h ago",  read:true  },
  { id:5, type:"signal", icon:TrendingUp,     color:"#26a69a", title:"WATCH Signal: RNDR",            desc:"RNDR consolidating near key support. Watch for breakout above $8.20 for entry.",              time:"5h ago",  read:true  },
  { id:6, type:"price",  icon:Zap,            color:"#ef5350", title:"ETH 24h: -2.76%",               desc:"Ethereum down 2.76% in the last 24 hours. Trading at $2,274. Volume above average.",          time:"6h ago",  read:true  },
  { id:7, type:"news",   icon:Newspaper,      color:"#2962ff", title:"SEC approves new ETF filing",   desc:"BlackRock's updated Bitcoin ETF application approved by the SEC after amendments.",            time:"8h ago",  read:true  },
  { id:8, type:"alert",  icon:AlertTriangle,  color:"#7c3aed", title:"Vesting unlock: ARB 31.2%",     desc:"Arbitrum will unlock 31.2% of supply on May 31 — potential sell pressure ahead.",             time:"12h ago", read:true  },
];

const TYPE_TABS = ["All", "Price", "Signals", "News", "Alerts"] as const;

export function NotificationCenter() {
  const [open, setOpen]                   = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL);
  const [tab, setTab]                     = useState<typeof TYPE_TABS[number]>("All");

  const unread = notifications.filter(n => !n.read).length;

  const markAllRead = () => setNotifications(ns => ns.map(n => ({ ...n, read: true })));
  const dismiss     = (id: number) => setNotifications(ns => ns.filter(n => n.id !== id));
  const markRead    = (id: number) => setNotifications(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));

  const visible = notifications.filter(n => {
    if (tab === "All")     return true;
    if (tab === "Price")   return n.type === "price";
    if (tab === "Signals") return n.type === "signal";
    if (tab === "News")    return n.type === "news";
    if (tab === "Alerts")  return n.type === "alert";
    return true;
  });

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative flex items-center justify-center w-8 h-8 rounded-xl transition-all hover:bg-white/5"
        style={{ color: unread > 0 ? "#4d7fff" : "#5a6072" }}
      >
        <Bell size={15} />
        {unread > 0 && (
          <motion.span
            initial={{ scale:0 }} animate={{ scale:1 }}
            className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white"
            style={{ background:"#ef5350", boxShadow:"0 0 8px rgba(239,83,80,0.6)" }}>
            {unread}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity:0, y:-6, scale:0.96 }}
              animate={{ opacity:1, y:0, scale:1 }}
              exit={{ opacity:0, y:-6, scale:0.96 }}
              transition={{ duration:0.15, ease:"easeOut" }}
              className="absolute right-0 top-full mt-2 z-50 rounded-2xl overflow-hidden"
              style={{ width:400, background:"rgba(10,14,22,0.98)", backdropFilter:"blur(28px)",
                WebkitBackdropFilter:"blur(28px)", border:"1px solid rgba(255,255,255,0.08)",
                boxShadow:"0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(41,98,255,0.05)" }}>

              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                    style={{ background:"rgba(41,98,255,0.15)", border:"1px solid rgba(41,98,255,0.25)" }}>
                    <Bell size={14} style={{ color:"#4d7fff" }} />
                  </div>
                  <span className="text-[13px] font-bold text-white">Notifications</span>
                  {unread > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black"
                      style={{ background:"rgba(239,83,80,0.15)", color:"#ef5350", border:"1px solid rgba(239,83,80,0.25)" }}>
                      {unread} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {unread > 0 && (
                    <button onClick={markAllRead}
                      className="flex items-center gap-1 px-2.5 h-7 rounded-lg text-[10px] font-semibold transition-all hover:bg-white/5"
                      style={{ color:"#5a6072" }}>
                      <Check size={11} /> Mark all read
                    </button>
                  )}
                  <button onClick={() => setOpen(false)}
                    className="w-7 h-7 rounded-xl flex items-center justify-center hover:bg-white/5 transition-colors"
                    style={{ color:"#5a6072" }}>
                    <X size={13} />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-0.5 px-3 pt-2 pb-1">
                {TYPE_TABS.map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className="px-2.5 h-7 rounded-lg text-[10px] font-semibold transition-all"
                    style={{
                      background: tab===t ? "rgba(41,98,255,0.2)" : "transparent",
                      color: tab===t ? "#4d7fff" : "#5a6072",
                    }}>
                    {t}
                  </button>
                ))}
              </div>

              {/* List */}
              <div className="overflow-y-auto" style={{ maxHeight:420 }}>
                {visible.length === 0 ? (
                  <div className="flex flex-col items-center py-10 text-center">
                    <Bell size={28} className="mb-2 opacity-20 text-white" />
                    <p className="text-[12px] font-semibold text-white mb-0.5">No notifications</p>
                    <p className="text-[10px]" style={{ color:"#5a6072" }}>You're all caught up!</p>
                  </div>
                ) : visible.map(n => (
                  <div key={n.id}
                    className="group flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer relative"
                    style={{ borderBottom:"1px solid rgba(255,255,255,0.04)",
                      background: !n.read ? "rgba(41,98,255,0.04)" : "transparent" }}
                    onClick={() => markRead(n.id)}>
                    {!n.read && (
                      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background:"#2962ff", boxShadow:"0 0 6px rgba(41,98,255,0.8)" }} />
                    )}
                    <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background:`${n.color}14`, border:`1px solid ${n.color}28` }}>
                      <n.icon size={16} style={{ color:n.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[12px] font-bold text-white leading-tight">{n.title}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[9px]" style={{ color:"#4a5068" }}>{n.time}</span>
                          <button
                            className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded-lg flex items-center justify-center hover:bg-white/10 transition-all"
                            style={{ color:"#5a6072" }}
                            onClick={e => { e.stopPropagation(); dismiss(n.id); }}>
                            <X size={10} />
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] mt-1 leading-relaxed" style={{ color:"#787b86" }}>{n.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-2.5"
                style={{ borderTop:"1px solid rgba(255,255,255,0.06)" }}>
                <button className="text-[10px] font-semibold transition-colors hover:text-white" style={{ color:"#4d7fff" }}>
                  View all notifications
                </button>
                <button className="flex items-center gap-1 text-[10px] font-semibold transition-colors hover:text-white" style={{ color:"#5a6072" }}>
                  <Settings size={11} /> Settings
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
